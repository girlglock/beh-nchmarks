#include <Mouse.h>

static const int sensorPin = A0;
static const int ledPin    = LED_BUILTIN;

static const int  luminanceThreshold = 800;
static const int  moveUnits          = 100;
static const int  leftMove           = -moveUnits;
static const int  rightMove          = moveUnits;

static_assert(moveUnits >= 1 && moveUnits <= 127, "moveUnits must be within 1..127");

static const uint32_t detectionTimeoutUs = 50000;
static const int      settleAfterResetMs = 350;
static const int      resetDelayMs       = 250;

static int  trialCount = 1000;
static bool aborted    = false;

int readAverage(int count) {
    long sum = 0;
    for (int i = 0; i < count; ++i) sum += analogRead(sensorPin);
    return sum / count;
}

void sendLeftMove()  { Mouse.move(leftMove,  0, 0); }
void sendRightMove() { Mouse.move(rightMove, 0, 0); }

int checkSerial() {
    if (!Serial.available()) return -1;
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.startsWith("SAMPLES:")) {
        int v = line.substring(8).toInt();
        if (v >= 16) trialCount = v;
        return -1;
    }
    if (line.length() == 0) return -1;
    int  si    = (line[0] == '-') ? 1 : 0;
    bool isNum = line.length() > (unsigned int)si;
    for (int i = si; i < (int)line.length() && isNum; i++) {
        if (!isDigit(line[i])) isNum = false;
    }
    return isNum ? line.toInt() : -1;
}

bool runTrial(
    int idx,
    int &baseline,
    int &peak,
    uint32_t &latencyUs,
    uint32_t &callDurationUs,
    uint32_t &samples,
    const char* &status) {

    status  = "OK";
    samples = 0;

    baseline = readAverage(32);
    if (baseline >= luminanceThreshold) {
        status         = "START_NOT_DARK";
        peak           = baseline;
        latencyUs      = 0;
        callDurationUs = 0;
        sendRightMove();
        delay(settleAfterResetMs);
        return false;
    }

    delayMicroseconds(random(1000, 16000));

    bool     crossed = false;
    peak             = 0;
    latencyUs        = 0;

    digitalWriteFast(ledPin, HIGH);

    uint32_t startTime = micros();
    sendLeftMove();
    callDurationUs = micros() - startTime;

    while ((micros() - startTime) < detectionTimeoutUs) {
        int value = analogRead(sensorPin);
        ++samples;
        if (value >= luminanceThreshold) {
            crossed   = true;
            peak      = value;
            latencyUs = micros() - startTime;
            break;
        }
    }

    digitalWriteFast(ledPin, LOW);

    if (!crossed) status = "NO_THRESHOLD_CROSS";

    delay(resetDelayMs);
    sendRightMove();
    delay(settleAfterResetMs);

    return crossed;
}

void runCapture() {
    aborted = false;

    int      validSamples = 0;
    uint32_t minLatency   = 0xFFFFFFFF;
    uint32_t maxLatency   = 0;
    double   sumLatency   = 0.0;

    Serial.println();
    Serial.println("CSV_START");
    Serial.println("trial,valid,reason,start_baseline,cross_value,latency_us,latency_ms,move_call_done_us,adc_reads");

    for (int trial = 1; trial <= trialCount; ++trial) {
        int         baseline     = 0;
        int         peak         = 0;
        uint32_t    latencyUs    = 0;
        uint32_t    callDuration = 0;
        uint32_t    reads        = 0;
        const char* reason       = "OK";

        bool valid = runTrial(trial, baseline, peak, latencyUs, callDuration, reads, reason);

        Serial.print(trial);                 Serial.print(",");
        Serial.print(valid ? 1 : 0);         Serial.print(",");
        Serial.print(reason);                Serial.print(",");
        Serial.print(baseline);              Serial.print(",");
        Serial.print(peak);                  Serial.print(",");
        Serial.print(latencyUs);             Serial.print(",");
        Serial.print(latencyUs / 1000.0, 3); Serial.print(",");
        Serial.print(callDuration);          Serial.print(",");
        Serial.println(reads);
        Serial.flush();

        if (valid) {
            ++validSamples;
            if (latencyUs < minLatency) minLatency = latencyUs;
            if (latencyUs > maxLatency) maxLatency = latencyUs;
            sumLatency += latencyUs;
        }

        if (checkSerial() == 0) {
            aborted = true;
            break;
        }
    }

    Serial.println("CSV_END");

    if (!aborted) {
        Serial.println();
        Serial.println("====================================");
        Serial.println("SUMMARY");
        Serial.print("VALID_SAMPLES: ");   Serial.println(validSamples);
        Serial.print("INVALID_SAMPLES: "); Serial.println(trialCount - validSamples);
        if (validSamples > 0) {
            double avgUs = sumLatency / validSamples;
            Serial.print("MIN_LATENCY_MS: "); Serial.println(minLatency / 1000.0, 3);
            Serial.print("AVG_LATENCY_MS: "); Serial.println(avgUs / 1000.0, 3);
            Serial.print("MAX_LATENCY_MS: "); Serial.println(maxLatency / 1000.0, 3);
        } else {
            Serial.println("NO_VALID_SAMPLES");
        }
        Serial.println("====================================");
        Serial.println("DONE.");
    }

    Serial.println();
}

void setup() {
    pinMode(ledPin, OUTPUT);
    pinMode(sensorPin, INPUT_PULLDOWN);
    Serial.begin(115200);
    Serial.setTimeout(50);
    analogReadResolution(12);
    analogReadAveraging(1);
    Mouse.begin();

    uint32_t waitStart = millis();
    while (!Serial && millis() - waitStart < 15000) {
        digitalWrite(ledPin, !digitalRead(ledPin));
        delay(150);
    }
    digitalWrite(ledPin, LOW);

    randomSeed(analogRead(A1) ^ micros());

    Serial.println();
    Serial.println("====================================");
    Serial.println("HID(mouseMove) to PHOTON LATENCY TEST");
    Serial.println("SAMPLES:N   set trial count");
    Serial.println("N           start with N second countdown");
    Serial.println("0           stop / abort");
    Serial.println("====================================");
    Serial.println();
}

void loop() {
    int cmd = checkSerial();

    if (cmd > 0) {
        bool countdownAborted = false;

        for (int i = cmd; i > 0 && !countdownAborted; --i) {
            Serial.print("TEST STARTING IN ");
            Serial.println(i);

            uint32_t tickEnd = millis() + 1000;
            while (millis() < tickEnd) {
                if (checkSerial() == 0) { countdownAborted = true; break; }
                delay(10);
            }
        }

        if (!countdownAborted) {
            runCapture();
        } else {
            Serial.println("Aborted.");
            Serial.println();
        }
    }

    delay(50);
}

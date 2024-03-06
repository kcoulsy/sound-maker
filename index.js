import fs from "fs";

// Constants and configuration
const duration = 10; // Duration of the track in seconds
const sampleRate = 244100; // Sample rate in Hz
const bitDepth = 16; // Bit depth
const channels = 2; // Number of channels (mono = 1, stereo = 2)
const timeSignature = [32, 4]; // Time signature (beats per measure, note value of one beat)
const bpm = 64; // Beats per minute

// Lo-fi effect parameters
const bitCrushBits = 16; // Bit crush effect bit depth
const downsampleFactor = 2; // Downsample factor
const vinylNoise = 0.01; // Vinyl noise level (0 to 1)
const distortionLevel = 0.05; // Distortion level (0 to 1)
const lowPassFreq = 6500; // Low-pass filter frequency (Hz)
const highPassFreq = 100; // High-pass filter frequency (Hz)

const melodyPattern = [
  // 0, 2, 4, 7, 9, 11, 9, 7, 4, 2, 0, 2, 4, 7, 9, 11, 9, 7, 4, 2,

  // new pattern
  0, 1, 1, 4, 7, 2, 34, 23, 1, 2, 3,

  // Add your new pattern here
];
// .map((n) => Math.pow(2, n / 12));

// Generate audio data
const audioData = generateLoFiTrack();

console.log("Audio data generated", audioData);
// Save audio data to a WAV file
const wavFile = "random_lofi_track.wav";
const wavBuffer = encodeWavData(audioData, sampleRate, bitDepth, channels);
fs.promises.writeFile(wavFile, wavBuffer);

function generateLoFiTrack() {
  const audioData = [];
  const beatsPerMeasure = timeSignature[0];
  const beatValue = timeSignature[1];
  const samplesPerBeat = (60 / bpm) * sampleRate;
  const samplesPerMeasure = samplesPerBeat * beatsPerMeasure;

  // Define a melody pattern

  let currentTime = 0;
  let measureCount = 0;
  let beatCount = 0;

  while (currentTime < duration * sampleRate) {
    const bassFreq = randomRange(40, 200);
    const melodyFreq =
      melodyPattern[(beatCount + 1) % melodyPattern.length] * 100 + 400;

    for (let i = 0; i < samplesPerBeat / beatValue; i++) {
      const t = currentTime / sampleRate;
      const bassWave = Math.sin(2 * Math.PI * bassFreq * t);
      const melodyWave = Math.sin(2 * Math.PI * melodyFreq * t);

      // Apply lo-fi effects
      const mixedWave = bassWave * 0.5 + melodyWave * 0.3;
      const bitCrushed = bitCrush(mixedWave, bitCrushBits);
      const downsampled = downsample(bitCrushed, downsampleFactor);
      const withVinylNoise = addVinylNoise(downsampled, vinylNoise);
      const distorted = distort(withVinylNoise, distortionLevel);
      const filtered = filterFrequencies(
        distorted,
        sampleRate,
        lowPassFreq,
        highPassFreq
      );

      // Interleave channels
      for (let j = 0; j < channels; j++) {
        audioData.push(encodeAudioSample(filtered, bitDepth));
      }

      currentTime++;
    }

    beatCount++;
    if (beatCount === beatsPerMeasure) {
      beatCount = 0;
      measureCount++;
    }
  }

  return audioData;
}

function encodeWavData(audioData, sampleRate, bitDepth, channels) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const buffer = Buffer.alloc(bufferSize);

  // Write RIFF chunk descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(bufferSize - 8, 4); // ChunkSize
  buffer.write("WAVE", 8);

  // Write format chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(channels, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(bitDepth, 34); // BitsPerSample

  // Write data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40); // Subchunk2Size

  // Write audio data
  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const sample = encodeAudioSample(audioData[i], bitDepth);
    buffer.writeInt16LE(sample, offset);
    offset += bytesPerSample;
  }

  return buffer;
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function bitCrush(sample, bits) {
  const max = Math.pow(2, bits - 1);
  const min = -max;
  return Math.round(sample * max) / max;
}

function downsample(sample, factor) {
  return sample * (1 / factor);
}

function addVinylNoise(sample, level) {
  return sample + (Math.random() * 2 - 1) * level;
}

function distort(sample, level) {
  return sample * (1 + level * Math.sin(sample * Math.PI));
}

function filterFrequencies(sample, sampleRate, lowPassFreq, highPassFreq) {
  const lowPassCoeff = Math.exp((-2 * Math.PI * lowPassFreq) / sampleRate);
  const highPassCoeff = Math.exp((-2 * Math.PI * highPassFreq) / sampleRate);
  const lowPassFilter = (1 - lowPassCoeff) / 2;
  const highPassFilter = (1 - highPassCoeff) / 2;

  let lowPassedSample = 0;
  let highPassedSample = 0;
  lowPassedSample =
    lowPassFilter * sample + lowPassCoeff * (lowPassedSample || 0);
  highPassedSample =
    highPassFilter * lowPassedSample + highPassCoeff * (highPassedSample || 0);

  return highPassedSample;
}

function encodeAudioSample(sample, bitDepth) {
  const maxValue = Math.pow(2, bitDepth - 1) - 1;
  const minValue = -maxValue;
  return Math.max(minValue, Math.min(maxValue, Math.round(sample * maxValue)));
}

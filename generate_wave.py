import wave
import math
import random
import struct

sample_rate = 44100
duration = 30  # seconds
total_samples = sample_rate * duration

print(f"Generating {duration}s seamless Caribbean beach ambience at {sample_rate}Hz...")

audio_data = []
left_last = 0.0
right_last = 0.0
wave_frequency = 1.0 / 6.5

for i in range(total_samples):
    t = i / sample_rate
    
    white_l = random.uniform(-1.0, 1.0)
    white_r = random.uniform(-1.0, 1.0)
    
    left_last = left_last * 0.98 + white_l * 0.02
    right_last = right_last * 0.98 + white_r * 0.02
    
    wave_envelope = 0.55 + 0.35 * math.sin(2 * math.pi * wave_frequency * t + math.sin(t * 0.5) * 0.5)
    
    loop_gain = 1.0
    if i < sample_rate * 0.5:
        loop_gain = i / (sample_rate * 0.5)
    elif i > total_samples - (sample_rate * 0.5):
        loop_gain = (total_samples - i) / (sample_rate * 0.5)
    
    sample_l = left_last * wave_envelope * 0.25 * loop_gain
    sample_r = right_last * wave_envelope * 0.25 * loop_gain
    
    int_l = int(max(-1.0, min(1.0, sample_l)) * 32767)
    int_r = int(max(-1.0, min(1.0, sample_r)) * 32767)
    
    audio_data.append(struct.pack('<hh', int_l, int_r))

output_path = '/app/applet/public/audio/san-blas-beach.wav'
with wave.open(output_path, 'w') as wav_file:
    wav_file.setnchannels(2)
    wav_file.setsampwidth(2)
    wav_file.setframerate(sample_rate)
    wav_file.writeframes(b''.join(audio_data))

print(f"Successfully generated {output_path}")

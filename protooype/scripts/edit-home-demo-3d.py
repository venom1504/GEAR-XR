"""Prototype-only edit. Keep the source immutable; remove the VR sentence.
Usage: python edit-home-demo-3d.py SOURCE OUTPUT [FFMPEG]
Source time: keep [0, 76/24), then [170/24, 100.25).
Opening subtitle replaced to match the surviving welcome. All other captions
remain burned in. Original narration stays at 1x, with a 10 ms fade at the cut.
"""
from pathlib import Path
import subprocess
import sys
source, output = map(Path, sys.argv[1:3])
assert source.resolve() != output.resolve()
a, b, end = 76 / 24, 170 / 24, 100.25
filters = (
    '[0:v]split[v0][v1];'
    f'[v0]trim=end={a},setpts=PTS-STARTPTS,'
    'drawbox=x=0:y=2000:w=iw:h=160:color=0x090e14:t=fill,'
    "drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial.ttf':"
    "text='Welcome to the GEAR-XR Brain Atlas demo.':fontsize=64:fontcolor=white:"
    'x=(w-text_w)/2:y=2050[vintro];'
    f'[v1]trim=start={b}:end={end},setpts=PTS-STARTPTS[vrest];'
    '[0:a]asplit[a0][a1];'
    f'[a0]atrim=end={a},asetpts=PTS-STARTPTS,afade=t=out:st={a-0.01}:d=0.01[aintro];'
    f'[a1]atrim=start={b}:end={end},asetpts=PTS-STARTPTS,afade=t=in:d=0.01[arest];'
    '[vintro][aintro][vrest][arest]concat=n=2:v=1:a=1[v][a]'
)
subprocess.run([sys.argv[3] if len(sys.argv)>3 else 'ffmpeg', '-hide_banner', '-nostdin',
    '-i', str(source), '-filter_complex', filters, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', str(output)],check=True)

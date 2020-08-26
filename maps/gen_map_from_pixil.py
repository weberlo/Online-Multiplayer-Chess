import base64
import json
import sys

assert len(sys.argv) == 2

with open(sys.argv[1]) as f:
    pixil = json.load(f)

width = int(pixil['width'])
height = int(pixil['height'])

board = [['' for j in range(width)] for i in range(height)]

LAYERS = {
    'pawns': 'p',
    'knights': 'n',
    'bishops': 'b',
    'rooks': 'r',
    'queens': 'q',
    'kings': 'k',
    'walls': 'x',
}

img_layers = pixil['frames'][0]['layers']

def board_set(i, j, val):
    if board[i][j] != '':
        raise RuntimeError(f'already written to ({i}, {j})')
    board[i][j] = val

color_to_player = {}
from PIL import Image
import tempfile
for layer in img_layers:
    layer_name = layer['name'].lower()
    assert layer_name in LAYERS
    img_data = base64.b64decode(layer['src'].split(',')[1])

    with open('tmp.png', 'wb') as f:
        f.write(img_data)
    img = Image.open('tmp.png')

    for i in range(height):
        for j in range(width):
            pix = img.getpixel((i, j))
            if sum(pix) == 0:
                continue

            if layer_name == 'walls':
                board_set(i, j, 'x')
            else:
                player = color_to_player.setdefault(pix, len(color_to_player))
                typ = LAYERS[layer_name]
                board_set(i, j, f'{typ}{player}')

print('[')
for i in range(height):
    suffix = ','
    if i == height - 1:
        suffix = ''
    print(f'  {board[i]}{suffix}')
print(']')

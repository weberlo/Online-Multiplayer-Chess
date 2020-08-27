#!/usr/bin/env bash
mv "$HOME/Downloads/${1}" .
python gen_map_from_pixil.py "${1}"

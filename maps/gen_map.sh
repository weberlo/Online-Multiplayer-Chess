#!/usr/bin/env bash

set -e

if [ $# -eq 0 ]; then
    echo 'need file name'
    exit 1
fi

mv "$HOME/Downloads/${1}" .
python gen_map_from_pixil.py "${1}"

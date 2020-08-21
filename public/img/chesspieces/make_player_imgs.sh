#!/usr/bin/env bash

mkdir "${1}"
magick ./0/b.png -fuzz 50% -fill "${2}" -opaque white "./${1}/b.png"
magick ./0/k.png -fuzz 50% -fill "${2}" -opaque white "./${1}/k.png"
magick ./0/n.png -fuzz 50% -fill "${2}" -opaque white "./${1}/n.png"
magick ./0/p.png -fuzz 50% -fill "${2}" -opaque white "./${1}/p.png"
magick ./0/q.png -fuzz 50% -fill "${2}" -opaque white "./${1}/q.png"
magick ./0/r.png -fuzz 50% -fill "${2}" -opaque white "./${1}/r.png"

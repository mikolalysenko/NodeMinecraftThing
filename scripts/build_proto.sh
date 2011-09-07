#!/bin/sh
for file in protocol/*; do
    echo $file
    scripts/pbj $file common/`basename $file`.js
done


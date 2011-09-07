#!/bin/sh

for file in protocol/*; do
    echo "Compiling protocol: "$file
    scripts/protojs/pbj $file common/`basename $file`.js
done


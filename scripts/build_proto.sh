#!/bin/sh

echo "Building protocol buffer data"
for file in protocol/*; do
    echo "Compiling protocol: "$file
    scripts/protojs/pbj $file common/`basename $file`.js
done


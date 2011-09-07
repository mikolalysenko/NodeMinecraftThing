#!/bin/sh
for file in protocol/*; do
    scripts/pbj $file $common/$file
done


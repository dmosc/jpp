#!/bin/bash
find tests/*.jpp -type f -print0 | while IFS= read -r -d $'\0' file; 
  do yarn test "$file" ;
done
# J++
J++ is a programming language aimed at offering commonly found mechanism
most major modern languages offer like: **arithmetic expressions**, **native iteration syntax**,
**subroutines**, **conditional flows**, **multi-dimensional variables**, 
**module creation and imports**, etc. Additionally, during intermediate code generation, 
J++ implements code optimization strategies to compress object code output and improve execution times.

## Run
Run the following command to compile and run a project

```
yarn compile -[d,p,r] [path/to/file].jpp

-d: Log intermediate code representation in console.
-p: Combine with -d to debug addresses.
-r: Run after compiling project.
```

## Getting started

```
import("lib/io.jpp") // Load read and write functions. //

program HelloWorld {
    var string name;
    name = read("What's your name? ");
    write("Hello " + name);
}
```
J++ philosophy and syntax follow tints of some of the most popular programming languages, promoting
a relatable and intuitive onboarding experience. The following code snippets aim at displaying the full
range of motion J++ can add to your thoughts when trying to express them as code.

### Type casting
All external data entering a program commonly arrives in the form of text. The `string.jpp` native
library exposes some useful type casting functions to arithmetically operate over numeric data. 
```
import("libs/io.jpp", "libs/string.jpp")

program TypeCasting {
    var int a;
    var float b;
    a = str_to_int("10.5");
    b = str_to_float("10.5");
    write(a); // 10 // <-- This is how you add comments.
    write(b); // 10 //
}
```

### Arithmetic
J++'s arithmetic precedence follows that of [C++](https://en.cppreference.com/w/cpp/language/operator_precedence),
allowing you to have a common expectation of results when computing complex expressions.
```
import("libs/io.jpp", "libs/math.jpp")

program Arithmetic {
    var int a, b, c;
    a = 7;
    b = 2;
    c = 10;
    write(a / b * (c * c / 5)); // 60 //
}
```

### Binary search
Typical search algorithm in a sorted array programmed in J++.
```
import("libs/io.jpp", "libs/string.jpp")

program BinarySearch {
    var int i, k, left, right, middle, arr[10];
    var bool found;

    i = 0;
    while (i < 10) {
        arr[i] = str_to_int(read("Value: "));
        i = i + 1;
    }

    k = str_to_int(read("Search for value: "));
    left = 0;
    right = 10;
    found = false;
    while (left < right && !found) {
        middle = (left + right) / 2;
        write(middle);
        if (arr[middle] == k) {
            write(k + " at index " + middle);
            found = true;
        } elif (arr[middle] < k) {
            left = middle + 1;
        } else {
            right = middle - 1;
        }
    }
    if (!found) {
        write(k + " not in array");
    }
}
```

### Objects
This is how you can instantiate objects in J++ and use them in your
program.
```
import("libs/io.jpp")

class Point {
    var int x, y;

    construct(int a, int b) {
        this.x = a;
        this.y = b;
    }

    func int getX() {
        return this.x;
    }

    func int getY() {
        return this.y;
    }
}

program Objects {
    var Point p1;
    p1 = new Point(1, 3);
    write("p1(x): " + p1.getX());
    write("p1(y): " + p1.getY());
}
```
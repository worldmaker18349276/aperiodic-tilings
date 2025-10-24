# Any-Precision Aperiodic Tilings Generator

just an aperiodic tilings generator (only Penrose tilings for now) for any precision: you can jump to any position of the tilings without disrupting the calculation.

about how to generate Penrose tilings, see [this article](https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/aperiodic-tilings/).

the position of a tile is described by [cyclotomic field](https://en.wikipedia.org/wiki/Cyclotomic_field) of root 5, where rational number is implemented using javascript's bigint.  in order to draw them on the screen, they need to be converted to floating point numbers within a given tolerance.  this is done by expressing them as polynomials with integer coefficients and then solving them, where we can enlarge denominator while writing polynomials to make it precise enough.


# Base32

Base 32 encoding and decoding for Deno, Bun, Node.js and browsers.

- No dependencies
- Custom alphabets
- Supports aliases (e.g. Crockford's Base32)
- Configurable case sensitivity
- Optional paddings

## Installation

To install the package, use one of the following methods:

### NPM

```sh
npm install @iiojib/base32
```

### Deno

```sh
deno add jsr:@iiojib/base32
```

### Bun

```sh
bun add @iiojib/base32
```

## Usage

### Encoding and Decoding

You can use the `Base32` and `Base32Hex`:

```typescript
import { Base32, Base32Hex } from "@iiojib/base32";

const utfEncoder = new TextEncoder();
const utfDecoder = new TextDecoder();

const input = utfEncoder.encode("hello!");

// Standard base 32 encoding
const encoded = Base32.encode(input);
console.log(encoded); // Output: NBSWY3DPEE

const encodedWithPadding = Base32.encode(input, true);
console.log(encodedWithPadding); // Output: NBSWY3DPEE======

const decoded = Base32.decode(encoded);
console.log(utfDecoder.decode(decoded)); // Output: hello!

// Base 32 encoding with extended hex alphabet
const encodedHex = Base32Hex.encode(input);
console.log(encodedHex); // Output: D1IMOR3F44

const decodedHex = Base32Hex.decode(encodedHex);
console.log(utfDecoder.decode(decodedHex)); // Output: hello!
```

### Note

The `Base32` and `Base32Hex` encodings are case insensitive.

### Custom Encoding

You can create a custom base 32 encoding with a given alphabet and options:

```typescript
import { makeBase32Encoding } from "@iiojib/base32";

const zBase32Alphabet = "YBNDRFG8EJKMCPQXOT1UWISZA345H769";
const zBase32 = makeBase32Encoding(zBase32Alphabet);

const utfEncoder = new TextEncoder();
const utfDecoder = new TextDecoder();

const encoded = zBase32.encode(utfEncoder.encode("hello!"));
console.log(encoded); // Output: PB1SA5DXRR

const decoded = zBase32.decode(encoded);
console.log(utfDecoder.decode(decoded)); // Output: hello!
```

### Options

You can customize the encoding with the following options:

- `caseSensitive`: If `true`, the encoding will be case-sensitive, default is `false`.
- `aliasTable`: Optional alias table for character substitution.
- `padding`: Padding character, default is `=`.

```typescript
const crockfordAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const weirdBase32 = makeBase32Encoding(crockfordAlphabet, {
  caseSensitive: true,
  aliasTable: { "O": "0", "I": "1", "L": "1" },
  padding: "*",
});
```

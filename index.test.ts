import { describe, test } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

import {
  Base32,
  BASE32_RFC4648_ALPHABET,
  BASE32_RFC4648_HEX_ALPHABET,
  Base32Hex,
  InvalidAliasTableError,
  InvalidAlphabetError,
  InvalidBase32StringError,
  InvalidPaddingError,
  makeBase32Encoding,
} from "./index.ts";

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

// See https://tools.ietf.org/html/rfc4648#section-10
describe("RFC 4648 Test Vectors", () => {
  const vectors = [
    { input: "", base32: "", base32hex: "" },
    { input: "f", base32: "MY======", base32hex: "CO======" },
    { input: "fo", base32: "MZXQ====", base32hex: "CPNG====" },
    { input: "foo", base32: "MZXW6===", base32hex: "CPNMU===" },
    { input: "foob", base32: "MZXW6YQ=", base32hex: "CPNMUOG=" },
    { input: "fooba", base32: "MZXW6YTB", base32hex: "CPNMUOJ1" },
    { input: "foobar", base32: "MZXW6YTBOI======", base32hex: "CPNMUOJ1E8======" },
  ];

  vectors.forEach(({ input, base32, base32hex }) => {
    test(`Base32: "${input}" -> "${base32}"`, () => {
      const encoded = Base32.encode(utf8Encoder.encode(input), true);
      const decoded = Base32.decode(base32);

      expect(encoded).toBe(base32);
      expect(utf8Decoder.decode(decoded)).toBe(input);
    });

    test(`Base32Hex: "${input}" -> "${base32hex}"`, () => {
      const encoded = Base32Hex.encode(utf8Encoder.encode(input), true);
      const decoded = Base32Hex.decode(base32hex);

      expect(encoded).toBe(base32hex);
      expect(utf8Decoder.decode(decoded)).toBe(input);
    });
  });
});

describe("Base32 Encoding", () => {
  const input = utf8Encoder.encode("hello!");

  test("standard alphabet", () => {
    const encoded = Base32.encode(input);
    const decoded = Base32.decode(encoded);

    expect(encoded).toBe("NBSWY3DPEE");
    expect(decoded).toEqual(input);
  });

  test("hexadecimal alphabet", () => {
    const encoded = Base32Hex.encode(input);
    const decoded = Base32Hex.decode(encoded);

    expect(encoded).toBe("D1IMOR3F44");
    expect(decoded).toEqual(input);
  });

  test("with padding", () => {
    const encoded = Base32.encode(input, true);

    expect(encoded).toBe("NBSWY3DPEE======");
  });

  test("decoding with padding", () => {
    const encoded = "NBSWY3DPEE======";
    const decoded = Base32.decode(encoded);

    expect(decoded).toEqual(input);
  });

  test("case sensitivity option", () => {
    const base32 = makeBase32Encoding(BASE32_RFC4648_ALPHABET, { caseSensitive: true });

    const encoded = base32.encode(input);

    expect(() => base32.decode(encoded.toLowerCase())).toThrow(InvalidBase32StringError);
  });

  test("alias table option", () => {
    const base32 = makeBase32Encoding(BASE32_RFC4648_HEX_ALPHABET, { aliasTable: { "Y": "1" } });

    const encoded = base32.encode(input);
    const decoded = base32.decode(encoded.replace("1", "Y"));

    expect(decoded).toEqual(input);
  });

  test("invalid base32 string", () => {
    expect(() => Base32.decode("invalid")).toThrow(InvalidBase32StringError);
  });

  test("self-testing with random input", () => {
    const input = crypto.getRandomValues(new Uint8Array(32));

    const encoded = Base32.encode(input);
    const decoded = Base32.decode(encoded);

    expect(decoded).toEqual(input);
  });
});

describe("makeBase32Encoding", () => {
  const input = utf8Encoder.encode("hello!");

  test("custom alphabet", () => {
    // z-base-32 alphabet
    const customAlphabet = "ybndrfg8ejkmcpqxot1uwisza345h769";
    const base32 = makeBase32Encoding(customAlphabet);
    const encoded = base32.encode(input);
    const decoded = base32.decode(encoded);

    expect(encoded).toBe("PB1SA5DXRR");
    expect(decoded).toEqual(input);
  });

  test("invalid alphabet", () => {
    expect(() => makeBase32Encoding("abc")).toThrow(InvalidAlphabetError);
    // Non single-byte character
    expect(() => makeBase32Encoding("ybndrfg8ejkmcpqxot1uwisza345h76💩")).toThrow(InvalidAlphabetError);
  });

  test("aliases", () => {
    // Crockford's Base32 alphabet with aliases for similar characters
    const crockfordAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const aliasTable = { "O": "0", "I": "1", "L": "1" };
    const base32 = makeBase32Encoding(crockfordAlphabet, { aliasTable });
    const encoded = base32.encode(input).replace("1", "i");
    const decoded = base32.decode(encoded);

    expect(encoded).toBe("DiJPRV3F44");
    expect(decoded).toEqual(input);
  });

  test("skip inherited properties in alias table", () => {
    const crockfordAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const aliasTable = Object.create({ "O": "0", "I": "1", "L": "1" });

    const base32 = makeBase32Encoding(crockfordAlphabet, { aliasTable });

    const encoded = base32.encode(input).replace("1", "i");

    expect(() => base32.decode(encoded)).toThrow(InvalidBase32StringError);
  });

  test("case-sensitive aliases", () => {
    // Crockford's Base32 alphabet with aliases for similar characters
    const crockfordAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const aliasTable = { "O": "0", "I": "1", "L": "1" };
    const base32 = makeBase32Encoding(crockfordAlphabet, { aliasTable, caseSensitive: true });
    const encoded = base32.encode(input).replace("1", "i");

    expect(() => base32.decode(encoded)).toThrow(InvalidBase32StringError);
  });

  test("invalid alias table", () => {
    expect(() => makeBase32Encoding(BASE32_RFC4648_ALPHABET, { aliasTable: { "a": "b" } })).toThrow(
      InvalidAliasTableError,
    );

    expect(() => makeBase32Encoding(BASE32_RFC4648_ALPHABET, { aliasTable: { "ab": "b" } })).toThrow(
      InvalidAliasTableError,
    );

    expect(() => makeBase32Encoding(BASE32_RFC4648_ALPHABET, { aliasTable: { "O": "Q" }, caseSensitive: true }))
      .toThrow(InvalidAliasTableError);
  });

  test("custom padding character", () => {
    const base32 = makeBase32Encoding(BASE32_RFC4648_ALPHABET, { padding: "*" });
    const encoded = base32.encode(input, true);

    expect(encoded).toBe("NBSWY3DPEE******");
  });

  test("invalid padding character", () => {
    expect(() => makeBase32Encoding(BASE32_RFC4648_ALPHABET, { padding: "a" })).toThrow(InvalidPaddingError);
    expect(() => makeBase32Encoding(BASE32_RFC4648_ALPHABET, { padding: "ab" })).toThrow(InvalidPaddingError);
  });
});

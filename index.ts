/** Standard Base32 alphabet as per RFC 4648[6] */
export const BASE32_RFC4648_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Base32 alphabet with extended hexadecimal characters as per RFC 4648[7] */
export const BASE32_RFC4648_HEX_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUV";

/** Encoding options for Base32 encoding */
export type EncodingOptions = {
  /** If true, the encoding will be case-sensitive */
  caseSensitive?: boolean;
  /** Optional alias table for character substitution */
  aliasTable?: Record<string, string>;
  /** Padding character, default is '=' */
  padding?: string;
};

/** Encode function signature */
export type Encode = (source: Uint8Array, withPadding?: boolean) => string;
/** Decode function signature */
export type Decode = (source: string) => Uint8Array;

/** Base32 encoding type */
export type Base32Encoding = {
  encode: Encode;
  decode: Decode;
};

/** Base class for Base32 errors */
export class Base32Error extends Error {
  override name = "Base32Error";
}

/** Error thrown when the alphabet is invalid */
export class InvalidAlphabetError extends Base32Error {
  override name = "InvalidAlphabetError";
}

/** Error thrown when the alias table is invalid */
export class InvalidAliasTableError extends Base32Error {
  override name = "InvalidAliasTableError";
}

/** Error thrown when the padding character is invalid */
export class InvalidPaddingError extends Base32Error {
  override name = "InvalidPaddingError";
}

/** Error thrown when the input string is invalid */
export class InvalidBase32StringError extends Base32Error {
  override name = "InvalidBase32StringError";
}

/** Factory function to create a Base32 encoding object with a given alphabet and options */
export const makeBase32Encoding = (
  alphabet: string,
  options?: EncodingOptions,
): Base32Encoding => {
  options = options || {};

  const caseSensitive = options.caseSensitive;
  const aliasTable = options.aliasTable;
  const padding = options.padding || "=";

  const utf8Encoder = new TextEncoder();

  if (!caseSensitive) {
    // Convert alphabet to uppercase if case sensitivity is not required
    alphabet = alphabet.toUpperCase();
  }

  if (new Set(utf8Encoder.encode(alphabet)).size !== 32) {
    throw new InvalidAlphabetError("The alphabet must contain exactly 32 unique single-byte characters");
  }

  // Create a lookup table for decoding
  const table: Record<string, number> = {};

  for (let i = 0; i < alphabet.length; i++) {
    if (caseSensitive) {
      table[alphabet[i]] = i;
    } else {
      table[alphabet[i].toUpperCase()] = table[alphabet[i].toLowerCase()] = i;
    }
  }

  if (aliasTable) {
    for (const alias in aliasTable) {
      // Skip inherited properties
      if (!Object.prototype.hasOwnProperty.call(aliasTable, alias)) {
        continue;
      }

      const value = aliasTable[alias];

      if (utf8Encoder.encode(alias).length !== 1 || !(value in table)) {
        throw new InvalidAliasTableError(
          "Alias should be a single character and value should be a valid character in the alphabet",
        );
      }

      if (caseSensitive) {
        if (alias in table) {
          throw new InvalidAliasTableError("Alias should not be present in the alphabet");
        }

        table[alias] = table[value];
      } else {
        const upper = alias.toUpperCase();
        const lower = alias.toLowerCase();

        if (upper in table || lower in table) {
          throw new InvalidAliasTableError("Alias should not be present in the alphabet");
        }

        table[upper] = table[lower] = table[value];
      }
    }
  }

  if (utf8Encoder.encode(padding).length !== 1 || padding in table) {
    throw new InvalidPaddingError("Padding character should be a single character and not present in the alphabet");
  }

  const encode = (source: Uint8Array, withPadding?: boolean): string => {
    let str = "";

    if (source.length === 0) {
      return str;
    }

    // Read the first byte
    let buff = source[0];
    let size = 8;
    let index = 1;

    while (true) {
      // Append the next 5-bit chunk to the output string
      str += alphabet[(buff >>> (size - 5)) & 0x1f];
      size -= 5;

      if (size < 5) {
        if (index === source.length) {
          if (size > 0) {
            // Append the remaining bits
            str += alphabet[(buff << (5 - size)) & 0x1f];
          }

          break;
        }

        // Read the next byte
        buff = (buff << 8) | source[index];
        size += 8;
        index += 1;
      }
    }

    if (withPadding) {
      // Add padding characters
      str += padding.repeat(8 - str.length % 8 & 0b111);
    }

    return str;
  };

  const decode = (source: string): Uint8Array => {
    let length = source.length;

    // Remove padding characters
    while (source[length - 1] === padding) {
      length -= 1;
    }

    const bytes = new Uint8Array((length * 5) / 8 | 0);

    if (length === 0) {
      return bytes;
    }

    let buff = 0;
    let size = 0;
    let byteIndex = 0;

    for (let index = 0; index < length; index += 1) {
      const value = table[source[index]];

      if (value === undefined) {
        throw new InvalidBase32StringError(`Character "${source[index]}" not found in the alphabet`);
      }

      // Append the next 5-bit chunk to the buffer
      buff = (buff << 5) | value;
      size += 5;

      if (size >= 8) {
        // Append the next byte to the output array
        bytes[byteIndex] = (buff >>> (size - 8)) & 0xff;
        size -= 8;
        byteIndex += 1;
      }
    }

    if ((buff & ((1 << size) - 1)) !== 0) {
      throw new InvalidBase32StringError("Input string contains incomplete bytes");
    }

    return bytes;
  };

  return { encode, decode };
};

/** Standard Base32 encoding */
export const Base32: Base32Encoding = makeBase32Encoding(BASE32_RFC4648_ALPHABET);

/** Base32 encoding with extended hexadecimal characters */
export const Base32Hex: Base32Encoding = makeBase32Encoding(BASE32_RFC4648_HEX_ALPHABET);

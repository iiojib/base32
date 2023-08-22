export const BASE32_RFC4648_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const BASE32_RFC4648_HEX_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUV";

export type EncodingOptions = {
  caseSensitive?: boolean;
  aliasTable?: Record<string, string>;
  padding?: string;
};

export type Encode = (source: Uint8Array, withPadding?: boolean) => string;
export type Decode = (source: string) => Uint8Array;

export type Base32Encoding = {
  encode: Encode;
  decode: Decode;
};

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
    alphabet = alphabet.toUpperCase();
  }

  if (new Set(utf8Encoder.encode(alphabet)).size !== 32) {
    throw new Error("The alphabet must contain exactly 32 unique single-byte characters");
  }

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
      if (!Object.prototype.hasOwnProperty.call(aliasTable, alias)) {
        continue;
      }

      const value = aliasTable[alias];

      if (utf8Encoder.encode(alias).length !== 1 || !(value in table)) {
        throw new Error(
          "Alias should be a single character and value should be a valid character in the alphabet",
        );
      }

      if (caseSensitive) {
        if (alias in table) {
          throw new Error("Alias should not be present in the alphabet");
        }

        table[alias] = table[value];
      } else {
        const upper = alias.toUpperCase();
        const lower = alias.toLowerCase();

        if (upper in table || lower in table) {
          throw new Error("Alias should not be present in the alphabet");
        }

        table[upper] = table[lower] = table[value];
      }
    }
  }

  if (utf8Encoder.encode(padding).length !== 1 || padding in table) {
    throw new Error("Padding character should be a single character and not present in the alphabet");
  }

  const encode = (source: Uint8Array, withPadding?: boolean): string => {
    let str = "";

    if (source.length === 0) {
      return str;
    }

    let buff = source[0];
    let size = 8;
    let index = 1;

    while (true) {
      str += alphabet[(buff >>> (size - 5)) & 0x1f];
      size -= 5;

      if (size < 5) {
        if (index === source.length) {
          if (size > 0) {
            str += alphabet[(buff << (5 - size)) & 0x1f];
          }

          break;
        }

        buff = (buff << 8) | source[index];
        size += 8;
        index += 1;
      }
    }

    if (withPadding) {
      str += padding.repeat(8 - str.length % 8 & 0b111);
    }

    return str;
  };

  const decode = (source: string): Uint8Array => {
    let length = source.length;

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
        throw new Error(`Character "${source[index]}" not found in the alphabet`);
      }

      buff = (buff << 5) | value;
      size += 5;

      if (size >= 8) {
        bytes[byteIndex] = (buff >>> (size - 8)) & 0xff;
        size -= 8;
        byteIndex += 1;
      }
    }

    if ((buff & ((1 << size) - 1)) !== 0) {
      throw new Error("Input string contains incomplete bytes");
    }

    return bytes;
  };

  return { encode, decode };
};

export const Base32 = makeBase32Encoding(BASE32_RFC4648_ALPHABET);
export const Base32Hex = makeBase32Encoding(BASE32_RFC4648_HEX_ALPHABET);

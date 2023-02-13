import { type FieldValues } from "react-hook-form";

const isKey = (value: string) => /^\w*$/.test(value);
const isObjectType = (value: unknown) => typeof value === "object";
const isNullOrUndefined = (value: unknown): value is null | undefined =>
  value == null;
const isDateObject = (value: unknown): value is Date => value instanceof Date;
const isObject = <T extends object>(value: unknown): value is T =>
  !isNullOrUndefined(value) &&
  !Array.isArray(value) &&
  isObjectType(value) &&
  !isDateObject(value);
const compact = <TValue>(value: TValue[]) =>
  Array.isArray(value) ? value.filter(Boolean) : [];
const stringToPath = (input: string): string[] =>
  compact(input.replace(/["|']|\]/g, "").split(/\.|\[/));
const isUndefined = (val: unknown): val is undefined => val === undefined;

export const fieldGet = <T>(
  obj: T,
  path: string,
  defaultValue?: unknown,
): unknown => {
  if (!path || !isObject(obj)) {
    return defaultValue;
  }

  const result = compact(path.split(/[,[\].]+?/)).reduce(
    (result, key) =>
      isNullOrUndefined(result) ? result : result[key as keyof object],
    obj,
  );

  return isUndefined(result) || result === obj
    ? isUndefined(obj[path as keyof T])
      ? defaultValue
      : obj[path as keyof T]
    : result;
};

export function fieldSet(object: FieldValues, path: string, value?: unknown) {
  let index = -1;
  const tempPath = isKey(path) ? [path] : stringToPath(path);
  const length = tempPath.length;
  const lastIndex = length - 1;

  while (++index < length) {
    const key = tempPath[index] || "";
    let newValue = value;

    if (index !== lastIndex) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const objValue = object[key];
      newValue =
        isObject(objValue) || Array.isArray(objValue)
          ? objValue
          : !isNaN(Number(tempPath[index + 1]))
          ? []
          : {};
    }
    object[key] = newValue;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    object = object[key];
  }
  return object;
}

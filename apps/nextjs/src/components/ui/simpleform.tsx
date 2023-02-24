import { type DefaultTFuncReturn } from "i18next";
import { useTranslation } from "next-i18next";
import {
  Fragment,
  type FormEventHandler,
  type HTMLInputTypeAttribute,
  type ReactNode,
} from "react";
import type {
  FieldErrors,
  FieldValues,
  Path,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";
import Spinner from "./spinner";

type SimpleFormField<T> = {
  label?: DefaultTFuncReturn;
  name: keyof T;
  required?: boolean | DefaultTFuncReturn;
  component?: ReactNode;
  type?: HTMLInputTypeAttribute;
  disabled?: boolean;
  unit?: DefaultTFuncReturn;
  rows?: number;
};

type SimpleFormProps<T extends FieldValues> = {
  fields: SimpleFormField<T>[];
  errors?: FieldErrors<T>;
  register: UseFormRegister<T>;
  onSubmit?: FormEventHandler<HTMLFormElement> | undefined;
  children?: ReactNode;
  className?: string;
  isLoading?: boolean;
  intialData?: T;
};

export default function SimpleForm<T extends FieldValues>({
  fields,
  errors,
  register,
  onSubmit,
  children,
  className = "",
  isLoading = false,
}: SimpleFormProps<T>): JSX.Element {
  return (
    <form
      className={`grid grid-cols-[auto_1fr] gap-2 ${className ?? ""}`}
      onSubmit={typeof onSubmit === "function" ? (e) => onSubmit(e) : undefined}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        fields.map((field) => {
          const fn = field.name as string;
          const isTextArea = field.rows && !isNaN(field.rows) && field.rows > 1;
          const options: RegisterOptions<T, Path<T>> = {
            required: field.required ?? false,
          };
          if (field.type === "date") options.valueAsDate = true;
          if (field.type === "number") options.valueAsNumber = true;
          return (
            <Fragment key={fn}>
              {field.type === "checkbox" ? (
                <div className="form-control col-span-2">
                  <label
                    className={`label cursor-pointer justify-start gap-4 ${
                      field.required ? "required" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox-primary checkbox"
                      {...register(fn as Path<T>)}
                      defaultChecked={false}
                    />
                    <span className="label-text">{field.label}</span>
                  </label>
                </div>
              ) : (
                <>
                  {field.label !== undefined ? (
                    <label
                      className={`${field.required ? "required" : ""} ${
                        isTextArea ? "self-start" : ""
                      }`}
                    >
                      {field.label}
                    </label>
                  ) : null}
                  <div
                    className={field.label === undefined ? "col-span-2" : ""}
                  >
                    {field.component ? (
                      field.component
                    ) : field.unit !== undefined ? (
                      <div className="input-group">
                        <input
                          {...register(fn as Path<T>, options)}
                          type={field.type || "text"}
                          disabled={field.disabled}
                          className="input-bordered input"
                        />
                        <span>{field.unit}</span>
                      </div>
                    ) : isTextArea ? (
                      <textarea
                        {...register(fn as Path<T>, {
                          required: field.required ?? false,
                        })}
                        disabled={field.disabled}
                        rows={field.rows}
                      />
                    ) : (
                      <input
                        {...register(fn as Path<T>, options)}
                        type={field.type || "text"}
                        disabled={field.disabled}
                        className="input-bordered input w-full"
                      />
                    )}
                    <TextError
                      err={errors?.[fn]?.message as string | undefined}
                    />
                  </div>
                </>
              )}
            </Fragment>
          );
        })
      )}
      {children}
    </form>
  );
}

type TextErrorProps = { err: string | undefined };

export function TextError({ err }: TextErrorProps) {
  const { t } = useTranslation("common");
  if (!err) return null;
  const msg = err || t("required") || "Error";

  return <p className="text-sm text-error">{msg}</p>;
}

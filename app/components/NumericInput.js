"use client";

export default function NumericInput({ value = "", onChange, integer = false, max, decimals = 2, ...props }) {
  function accept(next) {
    const expression = integer ? /^\d*$/ : new RegExp(`^\\d*(?:\\.\\d{0,${decimals}})?$`);
    if (!expression.test(next)) return;
    if (next !== "" && max !== undefined && Number(next) > Number(max)) return;
    onChange(next);
  }
  return <input
    {...props}
    type="text"
    inputMode={integer ? "numeric" : "decimal"}
    pattern={integer ? "[0-9]*" : `[0-9]+(?:\\.[0-9]{0,${decimals}})?`}
    value={value ?? ""}
    onChange={(event) => accept(event.target.value)}
    onPaste={(event) => {
      const pasted = event.clipboardData.getData("text").trim().replaceAll(",", "");
      const expression = integer ? /^\d*$/ : new RegExp(`^\\d*(?:\\.\\d{0,${decimals}})?$`);
      if (!expression.test(pasted) || (pasted && max !== undefined && Number(pasted) > Number(max))) event.preventDefault();
    }}
    onKeyDown={(event) => { if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault(); }}
  />;
}

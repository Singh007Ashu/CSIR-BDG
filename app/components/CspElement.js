"use client";
import {createContext,useContext,useId} from "react";
import {serializeStyle} from "../../lib/cspStyle";
export const StyleNonceContext=createContext("");
export function StyleNonceProvider({nonce,children}) {
  return <StyleNonceContext.Provider value={nonce}>{children}</StyleNonceContext.Provider>;
}
// A nonce-authorized stylesheet replaces HTML style attributes, including charts.
// React escapes stylesheet text; the serializer additionally rejects CSS delimiters.
export default function CspElement({as:Tag="div",css,className="",children,...props}) {
  const nonce=useContext(StyleNonceContext),id="csp-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  return <><style nonce={nonce}>{`.${id}{${serializeStyle(css)}}`}</style><Tag {...props} className={`${className} ${id}`.trim()}>{children}</Tag></>;
}

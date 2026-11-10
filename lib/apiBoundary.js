import { NextResponse } from "next/server";

// Keep malformed JSON/IDs and ORM validation failures out of HTML 500 pages.
// Do not serialize SQL, filesystem paths, credentials, or internal stack traces.
export function withApiBoundary(handler) {
  return async function boundedRoute(request, context) {
    try {
      const params=context?.params ? await context.params : null;
      if(params?.id!==undefined && (!/^\d+$/.test(params.id)||!Number.isSafeInteger(Number(params.id))||Number(params.id)<1))return NextResponse.json({error:"Invalid record identifier."},{status:400});
      return await handler(request, context);
    } catch(error) {
      if(error?.code === "PARSER_BUSY")return NextResponse.json({error:"Document processing is busy. Please retry shortly."},{status:503,headers:{"Retry-After":"5"}});
      if(error instanceof SyntaxError || error?.name === "PrismaClientValidationError" || (error instanceof TypeError && /FormData|Content-Type|JSON/i.test(error.message)))return NextResponse.json({error:"Invalid request. Check the submitted fields and file format."},{status:400});
      if(error?.code === "P2002")return NextResponse.json({error:"This record already exists."},{status:409});
      if(error?.code === "P2025")return NextResponse.json({error:"Record not found."},{status:404});
      if(error?.code === "P2003")return NextResponse.json({error:"Related record is invalid or still in use."},{status:409});
      const reference=crypto.randomUUID();console.error('API_FAILURE',reference,error?.code || error?.name || 'UNKNOWN');
      return NextResponse.json({error:"Unable to complete the request. Please contact the administrator.",reference},{status:500});
    }
  };
}

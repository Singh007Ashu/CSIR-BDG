import "./globals.css";
import "./portal.css";
import "./governance.css";
import "./automation.css";
import NavTabs from "./NavTabs";
import AuthBar from "./components/AuthBar";
import { getSession } from "../lib/session";
import { prisma } from "../lib/db";

export const metadata={title:"CSIR Business Development Group Platform",description:"Role-based CSIR technology, ECF, value and impact governance platform"};
async function identities(){const session=await getSession();if(!session)return{user:null,lab:null};if(session.type==="lab"){const lab=await prisma.lab.findUnique({where:{id:session.labId},select:{id:true,name:true,labId:true,primaryRole:true}});return{user:null,lab:lab?{...lab,role:lab.primaryRole}:null};}const user=await prisma.user.findUnique({where:{id:session.userId},include:{organization:true,assignedLab:{select:{id:true,code:true,name:true}}}});return{user:user?{id:user.id,name:user.name,role:user.role,organization:user.organization,assignedLab:user.assignedLab}:null,lab:null};}
export default async function RootLayout({children}){const{user,lab}=await identities();return <html lang="en"><body><header className="header"><a className="brand" href="/"><img src="/csir-logo.png" alt="CSIR Logo"/><div><h1>CSIR BDG GOVERNANCE PLATFORM</h1><p>Technology · ECF · Business Value · Impact</p></div></a><AuthBar user={user} lab={lab}/></header><NavTabs user={user} lab={lab}/><main>{children}</main><footer className="site-footer">CSIR internal decision-support platform · AI output always requires human validation</footer></body></html>}

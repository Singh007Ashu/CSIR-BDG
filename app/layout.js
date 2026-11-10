import "./globals.css";
import "./portal.css";
import "./governance.css";
import "./automation.css";
import "./sorted.css";
import "./shell.css";
import "./year-data.css";
import "./commercial.css";
import "./steep.css";
import "./flow.css";
import "./lab-flow.css";
import "./v2-dashboard.css";
import "./login-v2.css";
import "./sop-entry.css";
import "./projects-hub.css";
import "./professional.css";
import "./profile.css";
import "./sectors.css";
import "./hq-login.css";
import "./hq-full-image.css";
import "./notification-live.css";
import "./accessibility.css";
import AppShell from "./components/AppShell";
import { headers } from "next/headers";
import { StyleNonceProvider } from "./components/CspElement";
import { getSession } from "../lib/session";
import { prisma } from "../lib/db";

export const metadata={title:"CSIR Business Development Group Platform",description:"CSIR technology portfolio, collaboration, agreements and SOP governance platform"};
async function identities(){const session=await getSession();if(!session)return{user:null,lab:null};if(session.type==="lab"){const lab=await prisma.lab.findUnique({where:{id:session.labId},select:{id:true,name:true,labId:true,primaryRole:true}});return{user:null,lab:lab?{...lab,role:lab.primaryRole}:null};}const user=await prisma.user.findUnique({where:{id:session.userId},include:{organization:true,assignedLab:{select:{id:true,code:true,name:true}}}});return{user:user?{id:user.id,name:user.name,designation:user.designation,profilePhoto:user.profilePhoto,role:user.role,organization:user.organization,assignedLab:user.assignedLab}:null,lab:null};}
export default async function RootLayout({children}){const{user,lab}=await identities();const nonce=(await headers()).get("x-nonce")||"";return <html lang="en"><body><StyleNonceProvider nonce={nonce}><AppShell user={user} lab={lab}>{children}</AppShell></StyleNonceProvider></body></html>}

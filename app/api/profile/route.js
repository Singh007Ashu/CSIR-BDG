import { withApiBoundary } from "../../../lib/apiBoundary";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { scanUpload } from "../../../lib/malwareScan";
import { prisma } from "../../../lib/db";
import { requireUser } from "../../../lib/session";

export const runtime = "nodejs";
const roles = ["HEAD_ADMIN", "HEAD_BDG", "ADMIN", "SUPER_ADMIN"];
const select = { name: true, designation: true, profilePhoto: true };
async function account() {
  const { session, error } = await requireUser();
  if (error) return { error };
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.accountStatus !== "ACTIVE" || !roles.includes(user.role)) return { error: NextResponse.json({ error: "Access denied." }, { status: 403 }) };
  return { user };
}
async function GETHandler() {
  const { user, error } = await account(); if (error) return error;
  return NextResponse.json({ name: user.name, designation: user.designation || "", profilePhoto: user.profilePhoto }, { headers: { "Cache-Control": "no-store" } });
}
async function PATCHHandler(request) {
  const { user, error } = await account(); if (error) return error;
  if (Number(request.headers.get("content-length")) > 2 * 1024 * 1024 + 16384) return NextResponse.json({ error: "Photo must be 2 MB or smaller." }, { status: 413 });
  try {
    const form = await request.formData();
    const name = String(form.get("name") || "").trim();
    const designation = String(form.get("designation") || "").trim();
    if (!name || name.length > 100 || designation.length > 150 || /[\x00-\x1f]/.test(name + designation)) return NextResponse.json({ error: "Enter a name (up to 100 characters) and designation (up to 150 characters)." }, { status: 400 });
    const data = { name, designation: designation || null };
    if (form.get("removePhoto") === "true") data.profilePhoto = null;
    const photo = form.get("photo");
    if (photo && typeof photo !== "string" && photo.size) {
      if (photo.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Photo must be 2 MB or smaller." }, { status: 413 });
      if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return NextResponse.json({ error: "Choose a JPG, PNG or WebP image." }, { status: 400 });
      const buffer = Buffer.from(await photo.arrayBuffer());
      await scanUpload(buffer);
      const image = sharp(buffer, { limitInputPixels: 16000000 });
      const metadata = await image.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error("Invalid photo");
      const thumbnail = await image.rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
      data.profilePhoto = `data:image/webp;base64,${thumbnail.toString("base64")}`;
    }
    // Only the authenticated account's presentation fields can be updated.
    return NextResponse.json(await prisma.user.update({ where: { id: user.id }, data, select }));
  } catch {
    return NextResponse.json({ error: "Unable to save profile. Check the image and try again." }, { status: 400 });
  }
}

export const GET = withApiBoundary(GETHandler);
export const PATCH = withApiBoundary(PATCHHandler);

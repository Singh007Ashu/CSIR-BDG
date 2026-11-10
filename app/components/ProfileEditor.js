"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileEditor({ user }) {
  const router = useRouter(); const dialog = useRef(null); const trigger = useRef(null);
  const [name, setName] = useState(user.name); const [designation, setDesignation] = useState(user.designation || "");
  const [photo, setPhoto] = useState(null); const [preview, setPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { if (!photo) { setPreview(null); return; } const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [photo]);
  function open() { setName(user.name); setDesignation(user.designation || ""); setPhoto(null); setRemovePhoto(false); setMessage(""); dialog.current.showModal(); }
  function close() { if (!busy) { dialog.current.close(); trigger.current.focus(); } }
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("name", name); form.set("designation", designation); form.set("removePhoto", String(removePhoto)); if (photo) form.set("photo", photo);
      const response = await fetch("/api/profile", { method: "PATCH", body: form }); const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save profile.");
      setMessage("Profile updated successfully."); router.refresh();
    } catch (error) { setMessage(error.message || "Unable to connect. Please try again."); } finally { setBusy(false); }
  }
  const picture = preview || (!removePhoto && user.profilePhoto);
  return <><button ref={trigger} type="button" className="identity-dot profile-trigger" onClick={open} aria-label="Update my profile" title="Update my profile">{user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : user.name.charAt(0)}</button>
    <dialog ref={dialog} className="profile-dialog" aria-labelledby="profile-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <form onSubmit={save}><div className="profile-dialog-heading"><div><h2 id="profile-title">Update Profile</h2><p>Your name, designation and profile photograph.</p></div><button type="button" onClick={close} disabled={busy} aria-label="Close profile">×</button></div>
        <div className="profile-photo-row"><div className="profile-preview">{picture ? <img src={picture} alt="Profile preview" /> : (name || "H").charAt(0)}</div><div><label htmlFor="profile-photo">Profile photograph</label><input key={String(removePhoto)} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file && (file.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setMessage("Choose a JPG, PNG or WebP image up to 2 MB."); event.target.value = ""; return; } setPhoto(file || null); setRemovePhoto(false); setMessage(""); }} /><small>JPG, PNG or WebP · Maximum 2 MB</small>{picture && <button type="button" className="profile-remove" disabled={busy} onClick={() => { setPhoto(null); setRemovePhoto(true); }}>Remove photograph</button>}</div></div>
        <label htmlFor="profile-name">Full name</label><input id="profile-name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} disabled={busy} autoComplete="name" />
        <label htmlFor="profile-designation">Designation</label><input id="profile-designation" value={designation} onChange={event => setDesignation(event.target.value)} maxLength={150} disabled={busy} autoComplete="organization-title" placeholder="Head, Business Development Group" />
        <p className="profile-help">Your login, account role and permissions remain unchanged.</p>{message && <p role="status" className="profile-message">{message}</p>}
        <div className="profile-actions"><button type="button" className="btn secondary" onClick={close} disabled={busy}>Close</button><button className="btn" disabled={busy}>{busy ? "Saving…" : "Save Profile"}</button></div>
      </form>
    </dialog></>;
}

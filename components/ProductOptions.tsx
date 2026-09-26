"use client";
import { useState } from "react";
import { getItemPrice, spiceLevels, type MenuItem } from "../data/menu";
import type { CartLine } from "../lib/cart";
import Modal from "./Modal";
import ContactLinks from "./ContactLinks";
export default function ProductOptions({ item, editing, onClose, onSave }: { item: MenuItem; editing?: CartLine; onClose: () => void; onSave: (line: CartLine) => void }) {
  const [options, setOptions] = useState<Record<string, string>>(editing?.options ?? {});
  const [spice, setSpice] = useState(editing?.spice ?? "");
  const [instructions, setInstructions] = useState(editing?.instructions ?? "");
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [error, setError] = useState("");
  const price = options.size === "special" ? item.specialPrice : item.price;
  return <Modal title={`Choose ${item.en}`} onClose={onClose}><p className="eyebrow">MADE YOUR WAY</p><h2 lang="th">{item.th}</h2><p className="muted">{item.en}</p>{item.clarification ? <><div className="notice"><strong>40–50 THB</strong><p>{item.clarification}</p><p lang="th">กรุณาติดต่อร้านเพื่อเลือกเมนูและยืนยันราคา</p></div><ContactLinks /></> : <form onSubmit={(event) => { event.preventDefault(); try { getItemPrice(item, options); setError(""); onSave({ key: editing?.key ?? crypto.randomUUID(), id: item.id, options, spice: spice || undefined, instructions: instructions.trim(), quantity }); } catch (error) { setError(error instanceof Error ? error.message : "Please select your options."); } }}>
    {(item.groups ?? []).map((group) => <fieldset key={group.id}><legend><span lang="th">{group.th}</span> <span className="muted">/ {group.en}</span> <small>Required</small></legend><div className="choices">{group.choices.map((value) => <label key={value.id} className={`choice ${options[group.id] === value.id ? "selected" : ""}`}><input type="radio" name={group.id} required value={value.id} checked={options[group.id] === value.id} onChange={() => setOptions({ ...options, [group.id]: value.id })} /><span><b lang="th">{value.th}</b><small>{value.en}{group.id === "size" ? ` · ฿${value.id === "special" ? item.specialPrice : item.price}` : ""}</small></span></label>)}</div></fieldset>)}
    {item.spicy && <label className="field">ความเผ็ด / Spice level <span className="muted">(optional)</span><select value={spice} onChange={(event) => setSpice(event.target.value)}><option value="">Restaurant’s usual spice</option>{spiceLevels.map((entry) => <option value={entry.id} key={entry.id}>{entry.th} / {entry.en}</option>)}</select></label>}
    <label className="field">หมายเหตุ / Item instructions <span className="muted">(optional)</span><textarea maxLength={300} rows={2} placeholder="e.g. no peanuts / ไม่ใส่ถั่ว" value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
    <div className="product-bottom"><div className="quantity"><button type="button" aria-label="Decrease item quantity" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button><output aria-label="Item quantity">{quantity}</output><button type="button" aria-label="Increase item quantity" disabled={quantity >= 20} onClick={() => setQuantity(quantity + 1)}>+</button></div><strong>฿{(price ?? item.price ?? 0) * quantity}</strong></div>{error && <p role="alert" className="error-text">{error}</p>}<button className="primary w-full" type="submit">{editing ? "Save changes / บันทึก" : "Add to order / เพิ่มในออเดอร์"}<span>→</span></button>
  </form>}</Modal>;
}

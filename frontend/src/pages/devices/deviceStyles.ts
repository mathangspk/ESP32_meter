import { CSSProperties } from "react";

export const styles = {
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  } as CSSProperties,

  label: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  } as CSSProperties,

  input: {
    padding: "8px 12px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    color: "var(--text)",
    outline: "none",
  } as CSSProperties,

  select: {
    padding: "8px 12px",
    background: "rgba(0,0,0,0.2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    color: "var(--text)",
    outline: "none",
  } as CSSProperties,

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    minHeight: 38,
  } as CSSProperties,

  cardHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  } as CSSProperties,

  cardValue: {
    fontWeight: 600,
  } as CSSProperties,

  alertError: {
    marginBottom: 16,
    padding: "10px 12px",
    borderRadius: 6,
    fontSize: 13,
  } as CSSProperties,
};

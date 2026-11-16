import './Status.css';
export function Status({value}) { const text=value||'PENDING';return <span className={`status ${text.toLowerCase()}`}>{text}</span> }

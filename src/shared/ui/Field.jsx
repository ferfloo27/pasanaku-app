import './ui.css';

export default function Field({ id, label, help, error, children }) {
  return <div className="ui-field">
    <label htmlFor={id} className="ui-field__label">{label}</label>
    {children}
    {help && <span id={`${id}-help`} className="ui-field__help">{help}</span>}
    {error && <span id={`${id}-error`} className="ui-field__error">{error}</span>}
  </div>;
}

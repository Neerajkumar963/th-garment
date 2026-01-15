export default function FormInput({
    label,
    name,
    value,
    onChange,
    type = 'text',
    placeholder = '',
    required = false,
    min,
    step
}) {
    return (
        <div className="form-group">
            {label && (
                <label className="form-label" htmlFor={name}>
                    {label} {required && <span className="text-danger">*</span>}
                </label>
            )}
            <input
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                min={min}
                step={step}
                className="form-input"
            />
        </div>
    );
}

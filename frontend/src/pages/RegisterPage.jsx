import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerApi } from '../api';
import { useAuth } from '../authContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email:            '',
    phone_number:     '',
    password:         '',
    confirm_password: '',
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);

  const update = (field) => (e) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (form.password.length < 8)
      errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirm_password)
      errs.confirm_password = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await registerApi(form);
      login(data.user, data.tokens);
      navigate('/');
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object') {
        // map field errors from server
        setErrors({
          email:            d.email?.[0],
          phone_number:     d.phone_number?.[0],
          password:         d.password?.[0],
          confirm_password: d.confirm_password?.[0],
        });
      }
      setServerError(d?.non_field_errors?.[0] || '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">LAAM</Link>
        <h1 className="auth-title">Create account</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className={`form-input${errors.email ? ' form-input--error' : ''}`}
              type="email"
              required
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              className={`form-input${errors.phone_number ? ' form-input--error' : ''}`}
              type="tel"
              required
              value={form.phone_number}
              onChange={update('phone_number')}
              placeholder="+923001234567"
            />
            {errors.phone_number && <p className="form-error">{errors.phone_number}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-wrapper">
              <input
                className={`form-input${errors.password ? ' form-input--error' : ''}`}
                type={showPass ? 'text' : 'password'}
                required
                value={form.password}
                onChange={update('password')}
                placeholder="Min 8 characters"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPass(p => !p)}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="password-wrapper">
              <input
                className={`form-input${errors.confirm_password ? ' form-input--error' : ''}`}
                type={showConfirm ? 'text' : 'password'}
                required
                value={form.confirm_password}
                onChange={update('confirm_password')}
                placeholder="Re-enter password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(p => !p)}
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="form-error">{errors.confirm_password}</p>
            )}
          </div>

          {serverError && <p className="form-error">{serverError}</p>}

          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px 0' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
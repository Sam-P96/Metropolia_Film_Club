import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import backgroundImage from '../assets/purple_sparkle_1.gif'

const Signup = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const response = await fetch("/api/users/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const user = await response.json();

    if (!response.ok) {
      setError(user.error);
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));
    navigate("/");
  };

  const inputClasses =
    "w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10";

  const labelClasses = "mb-2 block text-sm font-medium text-white/70";

  return (
    <section className="flex items-center justify-center px-8 py-24 text-white">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      />
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink/60 p-8 shadow-xl shadow-black/50 backdrop-blur-xl sm:p-10">

        <h2 className="text-3xl font-bold">
          Join the <span className="text-brand-gold">club</span>
        </h2>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className={labelClasses}>
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="how other members will see you"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="email" className={labelClasses}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClasses}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={labelClasses}>
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClasses}
            />
          </div>

          <button className="w-full rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange">
            Sign up
          </button>

          {error && (
            <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white">
              {error}
            </p>
          )}
        </form>

        <p className="mt-8 text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-gold transition-colors hover:text-white"
          >
            Log in here
          </Link>
        </p>

      </div>
    </section>
  );
};

export default Signup;
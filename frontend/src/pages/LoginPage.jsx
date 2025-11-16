import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Sparkles, Shield, Zap } from "lucide-react";
import { login } from "../api/authAPI";
import { toast } from "react-toastify";

const LoginPage = () => {
  const navigate = useNavigate();
  
  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) {
      newErrors.username = "Username is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await login(formData.username, formData.password);
      
      // Store authentication token if provided
      if (response.token) {
        localStorage.setItem("token", response.token);
      }
      
      // Store user info if provided
      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
      }
      
      toast.success("Login successful!");
      // Redirect to landing page after successful login
      navigate("/");
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Invalid username or password";
      toast.error(errorMessage);
      setErrors({
        username: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: Shield, text: "Secure Access" },
    { icon: Sparkles, text: "Easy Management" },
    { icon: Zap, text: "Fast & Reliable" },
  ];

  return (
    <div className="min-h-screen flex relative bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Animated Background Elements - Full Page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"
          style={{
            animation: "float1 8s ease-in-out infinite"
          }}
        />
        <div
          className="absolute top-40 right-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"
          style={{
            animation: "float2 10s ease-in-out infinite",
            animationDelay: "1s"
          }}
        />
        <div
          className="absolute bottom-20 left-1/2 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"
          style={{
            animation: "float3 12s ease-in-out infinite",
            animationDelay: "2s"
          }}
        />
      </div>
      
      {/* Left Side - Image and Design */}
      <div className="w-1/2 relative flex items-center overflow-hidden z-10">

        {/* Content */}
        <div className="relative flex flex-col p-10 pl-20 w-full h-full justify-between">
          {/* Logo */}
          <div className="mb-7">
            <div className="text-3xl font-bold text-pink-600 tracking-tight">
              INDIRA IVF
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col flex-1 justify-center">
            {/* Banner Image */}
            <div className="mb-7 flex justify-center">
              <div className="w-4/5 max-w-md">
                <img
                  src="/mother-with-child.png"
                  alt="INDIRA IVF Banner"
                  className="w-full h-60 object-contain rounded-2xl"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div style={{ display: 'none' }} className="w-full h-48 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl flex items-center justify-center">
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 text-pink-600 mx-auto mb-4" />
                    <span className="text-gray-700 text-lg font-semibold">Welcome Banner</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-4 leading-tight">
                Welcome to
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                  Project Management Platform
                </span>
              </h2>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Streamline your projects with INDIRA IVF's comprehensive project
                management system. Track progress, manage stages, and collaborate
                efficiently with our intuitive platform.
              </p>
            </div>

            {/* Decorative Elements */}
            <div className="flex flex-wrap gap-6 mt-4">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-gray-700 animate-bounce"
                    style={{
                      animationDuration: "2s",
                      animationDelay: `${i * 0.3}s`
                    }}
                  >
                    <Icon className="w-5 h-5 text-pink-600" />
                    <span className="text-sm font-medium">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Text */}
          <div className="mt-auto pt-8 text-sm text-gray-600">
            <p>© 2024 INDIRA IVF. All rights reserved.</p>
          </div>
        </div>

        <style>{`
          @keyframes float1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(50px, 30px) scale(1.2); }
          }
          @keyframes float2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-40px, 50px) scale(1.3); }
          }
          @keyframes float3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(30px, -40px) scale(1.1); }
          }
        `}</style>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-1/2 flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-10 border border-gray-100">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Welcome Back
              </h1>
              <p className="text-sm text-gray-500">
                Sign in to access your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-200 ${
                      errors.username
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50 hover:border-pink-300 hover:bg-white"
                    }`}
                    placeholder="Enter your username"
                  />
                </div>
                {errors.username && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.username}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-200 ${
                      errors.password
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50 hover:border-pink-300 hover:bg-white"
                    }`}
                    placeholder="Enter your password"
                  />
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <span>•</span> {errors.password}
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
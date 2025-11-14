import React, { useState } from "react";
import axios from "axios";

const Form = () => {
  const [data, setData] = useState({
    name: "",
    number: "",
    age: "",
    category: "",
    department: "",
  });

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/users", data);
      alert("Data saved successfully!");
      setData({ name: "", number: "", age: "", category: "", department: "" });
    } catch (error) {
      alert("Error saving data!");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "300px",
        margin: "auto",
      }}
    >
      <input
        type="text"
        name="name"
        placeholder="Name"
        value={data.name}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="number"
        placeholder="Number"
        value={data.number}
        onChange={handleChange}
        required
      />
      <input
        type="number"
        name="age"
        placeholder="Age"
        value={data.age}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="category"
        placeholder="Category"
        value={data.category}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="department"
        placeholder="Department"
        value={data.department}
        onChange={handleChange}
        required
      />
      <button type="submit" style={{ marginTop: "10px" }}>
        Submit
      </button>
    </form>
  );
};

export default Form;

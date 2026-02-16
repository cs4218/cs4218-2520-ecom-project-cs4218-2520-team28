// Foo Chao, A0272024R

// AI generated UI fixes using github copilot(Grok Code Fast 1) for the following issues:
// Problem 1: Product cards had varying heights based on content, unlike the fixed width.
// Solution: Set fixed height (400px) for cards and image height (300px) to standardize dimensions.
// Problem 2: When content was short, it didn't center vertically in the card.
// Solution: Used flexbox on card-body with justify-content-center to center content.
// Problem 3: Products extended infinitely horizontally, making the page too wide.
// Solution: Added flex-wrap to container, set maxHeight with overflowY auto for vertical scrolling.

// Prompt 1: fix the UI of this file such that the prodcut height is standardised like the width and
// when the height is too small fit in centralised and make a scroll to scroll product instead of 
// infinitely extending the browser length

// Prompt 2: refer to home page to know the height/width ratio used but 
// do not change the styling here except for height width ratio 

// Prompt 3: help me complete the declaration above for problem and solution

// Bug fixes using Github Copilot (Claude Sonnet 4.5) Agent Mode:
// Fixed 1: Added null/undefined checks for API data (data?.products || [])
// Fixed 2: Handle missing product name/description gracefully (|| "")
// Fixed 3: Fixed typo in error message ("Someething" -> "Something")
// Prompt: Fix what is needed in main file so all test will pass

import React, { useState, useEffect } from "react";
import AdminMenu from "../../components/AdminMenu";
import Layout from "./../../components/Layout";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
const Products = () => {
  const [products, setProducts] = useState([]);

  //getall products
  const getAllProducts = async () => {
    try {
      const response = await axios.get("/api/v1/product/get-product");
      setProducts(response?.data?.products || []);
    } catch (error) {
      console.log(error);
      toast.error("Something Went Wrong");
    }
  };

  //lifecycle method
  useEffect(() => {
    getAllProducts();
  }, []);
  return (
    <Layout>
      <div className="row">
        <div className="col-md-3">
          <AdminMenu />
        </div>
        <div className="col-md-9 ">
          <h1 className="text-center">All Products List</h1>
          <div className="d-flex flex-wrap" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {products?.map((p) => (
              <Link
                key={p._id}
                to={`/dashboard/admin/product/${p.slug}`}
                className="product-link"
              >
                <div className="card m-2" style={{ width: "18rem", height: "400px", display: "flex", flexDirection: "column" }}>
                  <img
                    src={`/api/v1/product/product-photo/${p._id}`}
                    className="card-img-top"
                    alt={p.name}
                    style={{ height: "300px", objectFit: "cover" }}
                  />
                  <div className="card-body d-flex flex-column justify-content-center" style={{ flex: 1 }}>
                    <h5 className="card-title">{p.name || ""}</h5>
                    <p className="card-text">{p.description || ""}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Products;

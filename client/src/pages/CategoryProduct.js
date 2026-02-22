// Jian Tao - A0273320R
// fixed applied:
// - Renamed function from "getPrductsByCat" to "getProductsByCat" to correct the typo and improve code readability/maintainability.
// - Updated category state initialization from [] to {} to match actual usage as an object (e.g., category?.name).
// - Added defensive handling for product description rendering to prevent runtime errors when description is null/undefined before substring() is called.
// - Added defensive price rendering logic to validate price before applying toLocaleString(), and display "N/A" when price is missing/invalid.
// - Improved robustness of category/product rendering by using optional chaining in UI-bound fields to reduce risk of runtime crashes from incomplete API data.

import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/CategoryProductStyles.css";
import axios from "axios";
const CategoryProduct = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  // Fix Applied here: Updated category state initialization from [] to {} to match actual usage as an object (e.g., category?.name).
  const [category, setCategory] = useState({});

  useEffect(() => {
    // Fix Applied here: Renamed function from "getPrductsByCat" to "getProductsByCat" to correct the typo and improve code readability/maintainability.
    if (params?.slug) getProductsByCat();
  }, [params?.slug]);
  const getProductsByCat = async () => {
    try {
      const { data } = await axios.get(
        `/api/v1/product/product-category/${params.slug}`
      );
      setProducts(data?.products);
      setCategory(data?.category);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Layout>
      <div className="container mt-3 category">
        <h4 className="text-center">Category - {category?.name}</h4>
        <h6 className="text-center">{products?.length} result found </h6>
        <div className="row">
          <div className="col-md-9 offset-1">
            <div className="d-flex flex-wrap">
              {products?.map((p) => (
                <div className="card m-2" key={p._id}>
                  <img
                    src={`/api/v1/product/product-photo/${p._id}`}
                    className="card-img-top"
                    alt={p.name}
                  />
                  <div className="card-body">
                    <div className="card-name-price">
                      <h5 className="card-title">{p.name}</h5>
                      <h5 className="card-title card-price">
                        {/* Fix Applied here: Added defensive price rendering logic to validate price before applying toLocaleString(), and display "N/A" when price is missing/invalid. */}
                        {p?.price != null && !Number.isNaN(Number(p.price))
                          ? Number(p.price).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                            })
                          : "N/A"}
                      </h5>
                    </div>
                    <p className="card-text ">
                      {/* Fix Applied here: Added defensive handling for product description rendering to prevent runtime errors when description is null/undefined before substring() is called. */}
                      {p?.description?.substring(0, 60) || ""}...
                    </p>
                    <div className="card-name-price">
                      <button
                        className="btn btn-info ms-1"
                        onClick={() => navigate(`/product/${p.slug}`)}
                      >
                        More Details
                      </button>
                      {/* <button
                    className="btn btn-dark ms-1"
                    onClick={() => {
                      setCart([...cart, p]);
                      localStorage.setItem(
                        "cart",
                        JSON.stringify([...cart, p])
                      );
                      toast.success("Item Added to cart");
                    }}
                  >
                    ADD TO CART
                  </button> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* <div className="m-2 p-3">
            {products && products.length < total && (
              <button
                className="btn btn-warning"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(page + 1);
                }}
              >
                {loading ? "Loading ..." : "Loadmore"}
              </button>
            )}
          </div> */}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryProduct;
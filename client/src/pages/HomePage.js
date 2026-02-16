// Foo Chao, A0272024R
// Changes made:
// - Fix eslint warnings by adding missing dependencies to useEffect and useCallback hooks.
// - Rearrange code for better readability
// - Remove localstorage.setItem("cart", ...) to standardise with cart.js where key got changed to "cart:userId" or "cart:guest"
// - Temporarily removed loadmore button when filter is present as it loads everything when filter is present
// - Added loading state to show loading indicator when initial loading or applying filters, and hide loadmore button when loading
// - Added toasts for error handling in getAllCategory, getTotal, getAllProducts, loadMore, and filterProduct functions
// - Display no products found message when there is no product found and not loading, and hide it when loading to avoid confusion
// - Do not refresh window when pressing reset but clear it directly, and make sure the button itself does not show checked when pressing reset
// - Fix visual bug where first filter button (electronics) is unaligned with others

// AI assistance: Github Copilot (Grok Code Fast 1) Agent Mode
// Prompt 1: 
// Multiple prompts but generally request to fix eslint warnings and to reaarange code in a more logical way with vscode regions
//
// Prompt 2: 
// create a boolean derived state that checks if any filter is present be it radio or checked, 
// and using that state make sure load more button only shows when no filter present 
// because it loads everything when filter is present
//
// Prompt 3:
// I want to see the loading when initial loading or applying filters. 
// I proposed moving the loading outside and set the state when initial load and/or 
// applying filters and make sure loadmore does not show when anything is loading
//
// Prompt 4:
// Add toast when error happens for all apis
//
// Prompt 5:
// when no products found show no products found instead of being empty
//
// Prompt 6:
// when loading do not show no products found
//
// Prompt 7:
// when reset button pressed do not do window.reload instead just clear the filters
//
// Prompt 8:
// the button itself still show checked when i press reset
//
// Prompt 9(Sent to Github Copilot ChatGPT 5-mini as grok do not support images):
// image + "the electonics label a bit off"

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox, Radio } from "antd";
import { Prices } from "../components/Prices";
import { useCart } from "../context/cart";
import axios from "axios";
import toast from "react-hot-toast";
import Layout from "./../components/Layout";
import { AiOutlineReload } from "react-icons/ai";
import "../styles/Homepages.css";

const HomePage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useCart();

  //#region State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [checked, setChecked] = useState([]);
  const [radio, setRadio] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const hasFilters = useMemo(() => checked.length > 0 || radio.length > 0, [checked.length, radio.length]);
  //#endregion

  //#region Functions
  //get all cat
  const getAllCategory = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      if (data?.success) {
        setCategories(data?.category);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to load categories");
    }
  }, []);

  //getTOtal COunt
  const getTotal = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/v1/product/product-count");
      setTotal(data?.total);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load product count");
    }
  }, []);

  //load more
  // TODO: currently there is no paging when there is filter so button will be removed when there is filter,
  // we may add paging for filter in next milestone but for now we will just hide the button when there is filter to avoid confusion
  // depends on how much time we have, we may or may not do it
  const loadMore = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/v1/product/product-list/${page}`);
      setLoading(false);
      // TODO: there may be logic errors when user is viewing halfway and something got added to the product list, 
      // then the product list may change and user may miss some products or see duplicate products,
      // as this involve multiple units and integration, 
      // we will only fix it in next milestone to keep the current milestone focused on unit testing
      setProducts((prevProducts) => [...prevProducts, ...data?.products]);
    } catch (error) {
      console.log(error);
      setLoading(false);
      toast.error("Failed to load more products");
    }
  }, [page]);

  //get products
  const getAllProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/v1/product/product-list/1`);
      setLoading(false);
      setProducts(data.products);
    } catch (error) {
      setLoading(false);
      console.log(error);
      toast.error("Failed to load products");
    }
  }, []);

  //get filtered product
  // TODO: clothing filter does not always work. Probably on backend side error
  const filterProduct = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.post("/api/v1/product/product-filters", {
        checked,
        radio,
      });
      setLoading(false);
      setProducts(data?.products);
    } catch (error) {
      console.log(error);
      setLoading(false);
      toast.error("Failed to filter products");
    }
  }, [checked, radio]);

  // filter by cat
  const handleFilter = useCallback((value, id) => {
    let all = [...checked];
    if (value) {
      all.push(id);
    } else {
      all = all.filter((c) => c !== id);
    }
    setChecked(all);
  }, [checked]);
  //#endregion

  //#region Effects
  useEffect(() => {
    getAllCategory();
    getTotal();
  }, [getAllCategory, getTotal]);

  useEffect(() => {
    if (page === 1) return;
    loadMore();
  }, [page, loadMore]);

  useEffect(() => {
    if (!checked.length || !radio.length) {
      setPage(1);
      getAllProducts();
    }
  }, [checked.length, radio.length, getAllProducts]);

  useEffect(() => {
    if (checked.length || radio.length) filterProduct();
  }, [checked, radio, filterProduct]);
  //#endregion

  return (
    <Layout title={"ALL Products - Best offers "}>
      {/* banner image */}
      <img
        src="/images/Virtual.png"
        className="banner-img"
        alt="bannerimage"
        width={"100%"}
      />
      {/* below banner image */}
      <div className="container-fluid row mt-3 home-page">
        {/* filters */}
        <div className="col-md-3 filters">
          {/* category filters */}
          <h4 className="text-center">Filter By Category</h4>
          <div className="d-flex flex-column">
            {categories?.map((c) => (
              <div className="filter-item" key={c._id}>
                <Checkbox
                  checked={checked.includes(c._id)}
                  onChange={(e) => handleFilter(e.target.checked, c._id)}
                >
                  {c.name}
                </Checkbox>
              </div>
            ))}
          </div>
          {/* price filter */}
          <h4 className="text-center mt-4">Filter By Price</h4>
          <div className="d-flex flex-column">
            <Radio.Group value={radio} onChange={(e) => setRadio(e.target.value)}>
              {Prices?.map((p) => (
                <div key={p._id}>
                  <Radio value={p.array}>{p.name}</Radio>
                </div>
              ))}
            </Radio.Group>
          </div>
          {/* reset button */}
          <div className="d-flex flex-column">
            <button
              className="btn btn-danger"
              onClick={() => {
                setChecked([]);
                setRadio([]);
              }}
            >
              RESET FILTERS
            </button>
          </div>
        </div>
        {/* product list */}
        <div className="col-md-9 ">
          <h1 className="text-center">All Products</h1>
          {loading && <div className="text-center">Loading...</div>}
          <div className="d-flex flex-wrap">
            {products && products.length > 0 ? (
              products.map((p) => (
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
                        {p.price.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </h5>
                    </div>
                    <p className="card-text ">
                      {p.description.substring(0, 60)}...
                    </p>
                    <div className="card-name-price">
                      <button
                        className="btn btn-info ms-1"
                        onClick={() => navigate(`/product/${p.slug}`)}
                      >
                        More Details
                      </button>
                      <button
                        className="btn btn-dark ms-1"
                        onClick={() => {
                          setCart([...cart, p]);
                          toast.success("Item Added to cart");
                        }}
                      >
                        ADD TO CART
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              !loading && <div className="text-center w-100">No products found</div>
            )}
          </div>
          <div className="m-2 p-3">
            {products && products.length < total && !hasFilters && !loading && (
              <button
                className="btn loadmore"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(page + 1);
                }}
              >
                Loadmore <AiOutlineReload />
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
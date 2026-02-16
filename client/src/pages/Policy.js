// Foo Chao, A0272024R
// Modified alt text for img to be more meaningful
// Modified privcacy plociy to contain some dummy text to make it more realistic instead of multiple "add privacy policy"

import React from "react";
import Layout from "./../components/Layout";

const Policy = () => {
  return (
    <Layout title={"Privacy Policy"}>
      <div className="row contactus ">
        <div className="col-md-6 ">
          <img
            src="/images/contactus.jpeg"
            alt="Contact us illustration"
            style={{ width: "100%" }}
          />
        </div>
        <div className="col-md-4">
          <h1 className="bg-dark p-2 text-white text-center">PRIVACY POLICY</h1>
          <p className="text-justify mt-2">
            At E-Commerce App, we are committed to protecting your privacy. This
            Privacy Policy explains how we collect, use, and safeguard your
            personal information when you visit our website or use our services.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Policy;
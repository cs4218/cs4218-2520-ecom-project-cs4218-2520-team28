import React, { useEffect, useRef, useState } from "react";
import Layout from "./../../components/Layout";
import AdminMenu from "./../../components/AdminMenu";
import toast from "react-hot-toast";
import axios from "axios";
import CategoryForm from "../../components/Form/CategoryForm";
import { Modal } from "antd";
const CreateCategory = () => {
  const [categories, setCategories] = useState([]);
  // Chi Thanh, A0276229W
  // Guard async category updates so tests and runtime do not set state after unmount.
  const isMountedRef = useRef(true);
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [updatedName, setUpdatedName] = useState("");
  //handle Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post("/api/v1/category/create-category", {
        name,
      });
      if (data?.success) {
        toast.success(`${name} is created`);
        setName("");
        // Chi Thanh, A0276229W
        // Wait for category refresh before continuing so UI state settles predictably.
        await getAllCategory();
        // Foo Chao, A0272024R
        // AI Assistance: Github Copilot (Claude Sonnet 4.6)
        // Bug fix: notify Header's useCategory hook to re-fetch so the nav dropdown updates immediately
        window.dispatchEvent(new Event("categoryUpdated"));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      // Foo Chao, A0272024R
      // AI Assistance: Github Copilot (Claude Sonnet 4.6)
      // Bug fix: propagate backend error message (e.g. "Name is required", "Category Already Exists")
      toast.error(error.response?.data?.message || "something went wrong in input form");
    }
  };

  //get all cat
  const getAllCategory = async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      // Chi Thanh, A0276229W
      // Only update state while mounted to avoid late async updates.
      if (data.success && isMountedRef.current) {
        setCategories(data.category);
      }
    } catch (error) {
      console.log(error);
      // Foo Chao, A0272024R
      // AI Assistance: Github Copilot (Claude Sonnet 4.6)
      // fixed typo
      toast.error("Something went wrong in getting category");
    }
  };

  useEffect(() => {
    // Chi Thanh, A0276229W
    // Track mounted lifecycle for safe async setState handling.
    isMountedRef.current = true;
    getAllCategory();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  //update category
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.put(
        `/api/v1/category/update-category/${selected._id}`,
        { name: updatedName }
      );
      if (data.success) {
        toast.success(`${updatedName} is updated`);
        setSelected(null);
        setUpdatedName("");
        setVisible(false);
        await getAllCategory();
        // Foo Chao, A0272024R
        // AI Assistance: Github Copilot (Claude Sonnet 4.6)
        // Bug fix: notify Header's useCategory hook to re-fetch so the nav dropdown updates immediately
        window.dispatchEvent(new Event("categoryUpdated"));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      // Foo Chao, A0272024R
      // AI Assistance: Github Copilot (Claude Sonnet 4.6)
      // Bug fix: propagate backend error message (e.g. "Name is required")
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };
  //delete category
  const handleDelete = (pId) => {
    // Foo Chao, A0272024R
    // AI Assistance: Github Copilot (Claude Sonnet 4.6)
    // added confirmation modal before deleting a category to prevent accidental deletions
    Modal.confirm({
      title: "Are you sure you want to delete this category?",
      okText: "Yes",
      cancelText: "No",
      onOk: async () => {
        try {
          const { data } = await axios.delete(
            `/api/v1/category/delete-category/${pId}`
          );
          if (data.success) {
            toast.success("Category deleted successfully");
            await getAllCategory();
            // Foo Chao, A0272024R
            // AI Assistance: Github Copilot (Claude Sonnet 4.6)
            // Bug fix: notify Header's useCategory hook to re-fetch so the nav dropdown updates immediately
            window.dispatchEvent(new Event("categoryUpdated"));
          } else {
            toast.error(data.message);
          }
        } catch (error) {
          toast.error("Something went wrong");
        }
      },
    });
  };
  return (
    <Layout title={"Dashboard - Create Category"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>
          <div className="col-md-9">
            <h1>Manage Category</h1>
            <div className="p-3 w-50">
              <CategoryForm
                handleSubmit={handleSubmit}
                value={name}
                setValue={setName}
              />
            </div>
            <div className="w-75">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories?.map((c) => (
                      // Chi Thanh, A0276229W
                      // Use stable row key on the mapped element to satisfy React list key requirements.
                      <tr key={c._id}>
                        <td>{c.name}</td>
                        <td>
                          <button
                            className="btn btn-primary ms-2"
                            onClick={() => {
                              setVisible(true);
                              setUpdatedName(c.name);
                              setSelected(c);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger ms-2"
                            onClick={() => {
                              handleDelete(c._id);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Modal
              onCancel={() => setVisible(false)}
              footer={null}
              visible={visible}
            >
              <CategoryForm
                value={updatedName}
                setValue={setUpdatedName}
                handleSubmit={handleUpdate}
              />
            </Modal>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateCategory;
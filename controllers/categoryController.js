// Jian Tao - A0273320R


import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";
export const createCategoryController = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      // Foo Chao, A0272024R
      // AI Assistance: Github Copilot (Claude Sonnet 4.6)
      // fixed error code from 401 to 400 for bad request when name is missing in create category controller
      return res.status(400).send({ message: "Name is required" });
    }
    const existingCategory = await categoryModel.findOne({ name });
    if (existingCategory) {
      // Foo Chao, A0272024R
      // AI Assistance: Github Copilot (Claude Sonnet 4.6)
      // Bug fix: changed from 200/success:true to 409/success:false so the frontend
      // catch block can properly display the "Category Already Exists" message
      return res.status(409).send({
        success: false,
        message: "Category Already Exists",
      });
    }
    const category = await new categoryModel({
      name,
      slug: slugify(name),
    }).save();
    res.status(201).send({
      success: true,
      // Foo Chao, A0272024R
      // AI Assistance: Github Copilot (Claude Sonnet 4.6)
      // fixed typos
      message: "New Category Created",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      // Foo Chao, A0272024R
      // AI Assistance: Github Copilot (Claude Sonnet 4.6)
      // fixed typos
      message: "Error in Category",
    });
  }
};

//update category
export const updateCategoryController = async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;
    
    // Validate category ID
    if (!id) {
      return res.status(400).send({
        success: false,
        message: "Category ID is required",
      });
    }
    
    // Validate name
    if (!name) {
      return res.status(400).send({
        success: false,
        message: "Name is required",
      });
    }
    
    const category = await categoryModel.findByIdAndUpdate(
      id,
      { name, slug: slugify(name) },
      { new: true }
    );
    
    // Check if category was found
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }
    
    res.status(200).send({
      success: true,
      // Foo Chao, A0272024R
      // AI Assistance: Github Copilot (Claude Sonnet 4.6)
      // fixed typos
      message: "Category Updated Successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while updating category",
    });
  }
};

// Jian Tao - A0273320R
// get all cat
// fixed:
// - change function name from 'categoryControlller' to 'categoryController'
export const categoryController = async (req, res) => {
  try {
    const category = await categoryModel.find({});
    res.status(200).send({
      success: true,
      message: "All Categories List",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while getting all categories",
    });
  }
};

// Jian Tao - A0273320R
// single category
// fixed:
// - change message from 'Get SIngle Category SUccessfully' to 'Get single category successfully'
// - change error message from 'Error While getting Single Category' to 'Error while getting single category'
export const singleCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    res.status(200).send({
      success: true,
      message: "Get single category successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while getting single category",
    });
  }
};

//delete category
export const deleteCategoryController = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate category ID
    if (!id) {
      return res.status(400).send({
        success: false,
        message: "Category ID is required",
      });
    }
    
    const category = await categoryModel.findByIdAndDelete(id);
    
    // Check if category was found
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }
    
    res.status(200).send({
      success: true,
      message: "Category Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting category",
      error,
    });
  }
};

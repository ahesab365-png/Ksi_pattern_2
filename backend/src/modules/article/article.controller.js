import { ArticleModel } from "../../DB/model/article.model.js";
import cloudinary from '../../utils/cloudinary.js';

const extractPublicId = (url) => {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
    const splitUrl = url.split('/upload/');
    if (splitUrl.length < 2) return null;
    let path = splitUrl[1];
    if (path.match(/^v\d+\//)) {
        path = path.replace(/^v\d+\//, '');
    }
    const lastDotIndex = path.lastIndexOf('.');
    return lastDotIndex !== -1 ? path.substring(0, lastDotIndex) : path;
};

export const getArticles = async (req, res, next) => {
    try {
        console.log("Fetching all articles...");
        const { program, mainCategory, status } = req.query;
        const filter = {};
        if (program) filter.program = program;
        if (mainCategory) filter.mainCategory = mainCategory;
        if (status) filter.status = status;
        
        if (program || mainCategory) {
            filter.status = 'active';
        }


        const articles = await ArticleModel.find(filter).sort({ createdAt: -1 });
        console.log(`Found ${articles.length} articles.`);
        return res.status(200).json({ message: "Success", articles });
    } catch (error) {
        console.error("GET Articles Error:", error);
        return next(error);
    }
};

export const getArticleById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const article = await ArticleModel.findById(id);
        if (!article) return res.status(404).json({ message: "Article not found" });
        return res.status(200).json({ message: "Success", article });
    } catch (error) {
        return next(error);
    }
};

export const createArticle = async (req, res, next) => {
    try {
        const { title, content, image, program, mainCategory, category } = req.body;
        
        // Manual validation for cleaner error messages
        if (!title || !content || !image || !program || !mainCategory || !category) {
            return res.status(400).json({ 
                message: "جميع الحقول (العنوان، المحتوى، الصورة، البرنامج، القسم الرئيسي، التصنيف) مطلوبة" 
            });
        }

        console.log("Attempting to create a new article...");
        const article = await ArticleModel.create(req.body);
        console.log("Article created successfully:", article._id);
        return res.status(201).json({ message: "تم إنشاء المقالة بنجاح", article });
    } catch (error) {
        console.error("POST Article Error:", error);
        return next(error);
    }
};

export const updateArticle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        if (updateData.status) {
            updateData.isPublic = updateData.status === 'active';
        }
        const article = await ArticleModel.findByIdAndUpdate(id, updateData, { new: true });
        if (!article) return res.status(404).json({ message: "Article not found" });
        return res.status(200).json({ message: "Article updated successfully", article });
    } catch (error) {
        return next(error);
    }
};


export const deleteArticle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const article = await ArticleModel.findById(id);
        if (!article) return res.status(404).json({ message: "Article not found" });

        // Collect images from main image and steps
        const imageUrls = [];
        if (article.image) imageUrls.push(article.image);
        if (article.blocks && Array.isArray(article.blocks)) {
            article.blocks.forEach(block => {
                if (block.type === 'steps' && block.steps) {
                    block.steps.forEach(step => {
                        if (step.image) imageUrls.push(step.image);
                    });
                }
            });
        }

        // Delete images from Cloudinary synchronously or asynchronously
        for (const url of imageUrls) {
            const publicId = extractPublicId(url);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId);
                    console.log(`Deleted Cloudinary image: ${publicId}`);
                } catch (err) {
                    console.error(`Failed to delete Cloudinary image: ${publicId}`, err);
                }
            }
        }
        await ArticleModel.findByIdAndDelete(id);
        return res.status(200).json({ message: "Article and associated images deleted successfully" });
    } catch (error) {
        return next(error);
    }
};

export const bulkDeleteArticles = async (req, res, next) => {
    try {
        const { ids } = req.body; // Array of IDs
        if (!ids || !ids.length) return res.status(400).json({ message: "No IDs provided" });

        const articles = await ArticleModel.find({ _id: { $in: ids } });
        
        for (const article of articles) {
            const imageUrls = [];
            if (article.image) imageUrls.push(article.image);
            if (article.blocks && Array.isArray(article.blocks)) {
                article.blocks.forEach(block => {
                    if (block.type === 'steps' && block.steps) {
                        block.steps.forEach(step => {
                            if (step.image) imageUrls.push(step.image);
                        });
                    }
                });
            }

            for (const url of imageUrls) {
                const publicId = extractPublicId(url);
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId);
                    } catch (err) {
                        console.error(`Failed to delete Cloudinary image: ${publicId}`, err);
                    }
                }
            }
        }

        await ArticleModel.deleteMany({ _id: { $in: ids } });
        return res.status(200).json({ message: "Articles deleted successfully" });
    } catch (error) {
        return next(error);
    }
};

export const bulkUpdateArticlesStatus = async (req, res, next) => {
    try {
        const { ids, status } = req.body;
        if (!ids || !ids.length) return res.status(400).json({ message: "No IDs provided" });

        await ArticleModel.updateMany(
            { _id: { $in: ids } },
            { $set: { status, isPublic: status === 'active' } }
        );

        return res.status(200).json({ message: "Articles status updated successfully" });
    } catch (error) {
        return next(error);
    }
};

export const incrementViews = async (req, res, next) => {
    try {
        const { id } = req.params;
        await ArticleModel.findByIdAndUpdate(id, { $inc: { views: 1 } });
        return res.status(200).json({ message: "Views incremented" });
    } catch (error) {
        return next(error);
    }
};

export const incrementClicks = async (req, res, next) => {
    try {
        const { id } = req.params;
        await ArticleModel.findByIdAndUpdate(id, { $inc: { clicks: 1 } });
        return res.status(200).json({ message: "Clicks incremented" });
    } catch (error) {
        return next(error);
    }
};




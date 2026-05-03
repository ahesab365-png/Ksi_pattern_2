import { BASE_URL, ARTICLES_URL, UPLOAD_URL } from './api.config';

export const articleService = {
  // Upload Image to Cloudinary
  uploadImage: async (file) => {
    try {
        const token = localStorage.getItem('admin_token');
        
        // Convert file to Base64
        const toBase64 = (f) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
        
        const base64Image = await toBase64(file);

        const res = await fetch(`${UPLOAD_URL}/image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image: base64Image, fileName: file.name })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'فشل رفع الصورة، يرجى التواصل مع الدعم الفني');
        }
        const data = await res.json();
        return data.imageUrl; // Cloudinary URL
    } catch (error) {
        console.error("articleService uploadImage error:", error);
        throw error;
    }
  },

  // Get all articles
  getAll: async () => {
    try {
        const res = await fetch(ARTICLES_URL);
        if (!res.ok) throw new Error('Failed to fetch articles');
        const data = await res.json();
        return data.articles || [];
    } catch (error) {
        console.error("articleService getAll error:", error);
        return [];
    }
  },

  // Save new article
  save: async (article) => {
    try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(ARTICLES_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(article)
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Failed to save article');
        }
        
        const data = await res.json();
        return data.article;
    } catch (error) {
        console.error("articleService save error:", error);
        throw error;
    }
  },

  // Get articles by program and main category
  getByCategory: async (programId, mainCategory) => {
    try {
        const res = await fetch(`${ARTICLES_URL}?program=${programId}&mainCategory=${mainCategory}`);
        if (!res.ok) throw new Error('Failed to fetch filtered articles');
        const data = await res.json();
        return (data.articles || []).filter(a => a.isPublic);
    } catch (error) {
        console.error("articleService getByCategory error:", error);
        return [];
    }
  },

  // Get unique subcategories
  getSubCategories: async (programId, mainCategory) => {
    const articles = await articleService.getByCategory(programId, mainCategory);
    
    const subCatsMap = {};
    articles.forEach(art => {
      if (!subCatsMap[art.category]) {
        subCatsMap[art.category] = art._id;
      }
    });
    
    return Object.keys(subCatsMap).map(cat => ({
      name: cat,
      articleId: subCatsMap[cat]
    }));
  },

  // Get article by ID
  getById: async (id) => {
    try {
        const res = await fetch(`${ARTICLES_URL}/${id}`);
        if (!res.ok) throw new Error('Article not found');
        const data = await res.json();
        return data.article;
    } catch (error) {
        console.error("articleService getById error:", error);
        return null;
    }
  },

  // Update article
  update: async (id, updatedData) => {
    try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${ARTICLES_URL}/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedData)
        });
        if (!res.ok) throw new Error('Failed to update article');
        const data = await res.json();
        return data.article;
    } catch (error) {
        console.error("articleService update error:", error);
        throw error;
    }
  },

  // Remove article
  remove: async (id) => {
    try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${ARTICLES_URL}/${id}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        return res.ok;
    } catch (error) {
        console.error("articleService remove error:", error);
        return false;
    }
  },
  // Update status for multiple articles
  bulkUpdateStatus: async (ids, status) => {
    try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${ARTICLES_URL}/bulk-status`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ids, status })
        });
        return res.ok;
    } catch (error) {
        console.error("articleService bulkUpdateStatus error:", error);
        return false;
    }
  },


  // Remove multiple articles
  bulkRemove: async (ids) => {
    try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${ARTICLES_URL}/bulk-delete`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ids })
        });
        return res.ok;
    } catch (error) {
        console.error("articleService bulkRemove error:", error);
        return false;
    }
  },
  
  // Track View
  trackView: async (id) => {
    try {
        await fetch(`${ARTICLES_URL}/${id}/view`, { method: 'POST' });
    } catch (error) {
        console.error("trackView error:", error);
    }
  },

  // Track Click
  trackClick: async (id) => {
    try {
        await fetch(`${ARTICLES_URL}/${id}/click`, { method: 'POST' });
    } catch (error) {
        console.error("trackClick error:", error);
    }
  }
};



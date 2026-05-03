import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { 
  Save, Image as ImageIcon, Plus, Trash2, Eye, EyeOff, Settings, 
  Type, X, FileText, Loader2, Video, ListOrdered, AlignLeft, 
  ChevronUp, ChevronDown, MoveHorizontal
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { articleService } from '../services/articleService';
import { categoryService } from '../services/categoryService';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);
const DRAFT_KEY = 'article_creation_draft';

const CreateArticle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  // States
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [program, setProgram] = useState('1');
  const [mainCategory, setMainCategory] = useState('women');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [blocks, setBlocks] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [categoryImage, setCategoryImage] = useState(null);
  const [isUploadingCatImage, setIsUploadingCatImage] = useState(false);

  const mainCategories = [
    { id: 'women', title: 'حريمي' },
    { id: 'men', title: 'رجالي' },
    { id: 'kids', title: 'أطفال' },
  ];

  // Load Initial Data
  useEffect(() => {
    const loadCategories = async () => {
        const cats = await categoryService.getAll();
        setAllCategories(cats);
    };
    loadCategories();

    const fetchArticle = async () => {
      if (isEditMode) {
        const art = await articleService.getById(id);
        if (art) {
          setTitle(art.title);
          setContent(art.content);
          setProgram(art.program);
          setMainCategory(art.mainCategory);
          setCategory(art.category);
          setIsPublic(art.isPublic);
          setBlocks(art.blocks || []);
          
          // Find category image
          const matchingCat = allCategories.find(c => c.name === art.category && c.mainCategory === art.mainCategory && c.program === art.program);
          if (matchingCat) setCategoryImage(matchingCat.image);
        }
      }
    };
    fetchArticle();
  }, [id, isEditMode, allCategories.length]);

  const handleSave = async (publish = true) => {
    if (!title.trim()) {
        return MySwal.fire({ title: 'بيانات ناقصة', text: 'يرجى كتابة عنوان للمقال على الأقل لحفظه', icon: 'warning', confirmButtonText: 'حسناً' });
    }

    if (publish) {
        if (!category.trim()) {
            return MySwal.fire({ title: 'بيانات ناقصة', text: 'يرجى تحديد نوع القطعة قبل النشر', icon: 'warning', confirmButtonText: 'حسناً' });
        }
        if (!categoryImage) {
            return MySwal.fire({ title: 'بيانات ناقصة', text: 'يرجى رفع صورة غلاف (Thumbnail) للمقالة قبل النشر', icon: 'warning', confirmButtonText: 'حسناً' });
        }
        if (blocks.length === 0) {
            return MySwal.fire({ title: 'محتوى فارغ', text: 'يرجى إضافة قسم واحد على الأقل للمقال قبل النشر', icon: 'warning', confirmButtonText: 'حسناً' });
        }
    }

    setIsSaving(true);
    try {
        const articleData = { 
          title, 
          content, 
          image: categoryImage, // Main article thumbnail
          program, 
          mainCategory, 
          category, 
          status: publish ? 'active' : 'draft',
          isPublic: publish,
          blocks
        };

        if (category && categoryImage) {
            await categoryService.upsert({
                name: category,
                image: categoryImage,
                mainCategory,
                program
            });
        }

        if (isEditMode) {
            await articleService.update(id, articleData);
        } else {
            await articleService.save(articleData);
            localStorage.removeItem(DRAFT_KEY);
        }
        MySwal.fire({ 
            title: publish ? 'تم النشر بنجاح!' : 'تم الحفظ كمسودة!', 
            icon: 'success', 
            timer: 2000, 
            showConfirmButton: false 
        });
        navigate('/admin');
    } catch (error) {
        MySwal.fire({ title: 'خطأ أثناء الحفظ', text: error.message, icon: 'error' });
    } finally {
        setIsSaving(false);
    }
  };

  // Block Management Functions
  const addBlock = (type) => {
    let newBlock = { type, id: Date.now() };
    if (type === 'title') newBlock.title = '';
    if (type === 'extra') { newBlock.title = ''; newBlock.content = ''; }
    if (type === 'video') newBlock.videoUrl = '';
    if (type === 'steps') newBlock.steps = [{ id: Date.now(), title: '', text: '', image: null }];
    
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (index) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const updateBlock = (index, field, value) => {
    const newBlocks = [...blocks];
    newBlocks[index][field] = value;
    setBlocks(newBlocks);
  };

  const moveBlock = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  // Steps within a Block Management
  const addStepToBlock = (blockIndex) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].steps.push({ id: Date.now(), title: '', text: '', image: null });
    setBlocks(newBlocks);
  };

  const removeStepFromBlock = (blockIndex, stepIndex) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].steps = newBlocks[blockIndex].steps.filter((_, i) => i !== stepIndex);
    setBlocks(newBlocks);
  };

  const updateStepInBlock = (blockIndex, stepIndex, field, value) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].steps[stepIndex][field] = value;
    setBlocks(newBlocks);
  };

  const handleStepImageUpload = async (blockIndex, stepIndex, file) => {
    if (!file) return;
    try {
      updateStepInBlock(blockIndex, stepIndex, 'isUploading', true);
      const url = await articleService.uploadImage(file);
      updateStepInBlock(blockIndex, stepIndex, 'image', url);
    } catch (error) {
      MySwal.fire({ title: 'خطأ في الرفع', text: error.message || 'حدث خطأ غير معروف', icon: 'error' });
    } finally {
      updateStepInBlock(blockIndex, stepIndex, 'isUploading', false);
    }
  };

  const handleCategoryImageUpload = async (file) => {
     if (!file) return;
     try {
       setIsUploadingCatImage(true);
       const url = await articleService.uploadImage(file);
       setCategoryImage(url);
     } catch (error) {
       MySwal.fire({ title: 'خطأ في الرفع', text: error.message || 'حدث خطأ غير معروف', icon: 'error' });
     } finally {
       setIsUploadingCatImage(false);
     }
   };

  return (
    <div className="min-h-screen bg-slate-50 font-arabic pb-32">
      {/* Responsive Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-[120] px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-right w-full md:w-auto flex items-center justify-between md:block">
            <button onClick={() => navigate('/admin')} className="md:hidden p-2 text-slate-400"><X /></button>
            <div>
              <h1 className="text-lg md:text-2xl font-black text-slate-800">{isEditMode ? 'تعديل الدرس' : 'إضافة درس جديد'}</h1>
              <p className="text-slate-400 text-[10px] hidden md:block">نظام المنشورات الديناميكي</p>
            </div>
            <div className="md:hidden"></div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={() => handleSave(false)} 
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black transition-all"
            >
              <FileText size={16} /> <span>المسودة</span>
            </button>
            <button 
              onClick={() => handleSave(true)} 
              disabled={isSaving}
              className="flex-[2] md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
            >
              <Save size={16} /> <span>{isEditMode ? 'حفظ' : 'نشر'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-3xl p-4 md:p-10 shadow-sm border border-slate-100">
               <div className="space-y-6 text-right">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-black block pr-1">عنوان المقال الرئيسي <span className="text-red-500">*</span></label>
                    <div className="relative group">
                      <Type className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={20} />
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-2xl pr-10 py-4 text-xl md:text-2xl font-black text-slate-800 focus:ring-4 focus:ring-blue-50/50 focus:border-blue-500 transition-all text-right outline-none"
                        placeholder="اكتب عنوان الدرس هنا..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-black block pr-1">وصف و مقدمة الدرس <span className="text-red-500">*</span></label>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                      <ReactQuill 
                        value={content} 
                        onChange={setContent}
                        theme="snow"
                        className="quill-bold-border border-none"
                      />
                    </div>
                  </div>
               </div>
            </div>

            {/* Dynamic Blocks Container */}
            <div className="space-y-10">
              {blocks.map((block, index) => (
                <div key={block.id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Block Actions Toolbar (Floating) */}
                  <div className="absolute -left-4 top-0 -translate-x-full hidden lg:flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => moveBlock(index, 'up')} className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-black"><ChevronUp size={16} /></button>
                    <button onClick={() => moveBlock(index, 'down')} className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-black"><ChevronDown size={16} /></button>
                    <button onClick={() => removeBlock(index)} className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>

                  <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                        <div className="flex items-center gap-2 lg:hidden">
                            <button onClick={() => moveBlock(index, 'up')} className="p-2 text-slate-400"><ChevronUp size={18} /></button>
                            <button onClick={() => moveBlock(index, 'down')} className="p-2 text-slate-400"><ChevronDown size={18} /></button>
                            <button onClick={() => removeBlock(index)} className="p-2 text-red-400"><Trash2 size={18} /></button>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                {block.type === 'title' && 'عنوان فرعي'}
                                {block.type === 'steps' && 'خطوات مرقمة'}
                                {block.type === 'video' && 'فيديو توضيحي'}
                                {block.type === 'extra' && 'قسم إضافي'}
                             </span>
                        </div>
                    </div>

                    {/* Block Renderers */}
                    {block.type === 'title' && (
                        <div className="text-right space-y-2">
                            <label className="text-[10px] font-black text-slate-400 block pr-1">اسم القسم / العنوان الفرعي</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-800 text-right outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="مثال: تعليمات هامة للمرحلة القادمة"
                                value={block.title}
                                onChange={(e) => updateBlock(index, 'title', e.target.value)}
                            />
                        </div>
                    )}

                    {block.type === 'extra' && (
                        <div className="text-right space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 block pr-1">عنوان القسم</label>
                                <input 
                                    type="text"
                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-800 text-right outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="مثال: الأدوات المطلوبة"
                                    value={block.title}
                                    onChange={(e) => updateBlock(index, 'title', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 block pr-1">محتوى القسم</label>
                                <textarea 
                                    className="w-full h-32 bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-600 text-right resize-none outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="اكتب المحتوى هنا..."
                                    value={block.content}
                                    onChange={(e) => updateBlock(index, 'content', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {block.type === 'video' && (
                        <div className="text-right space-y-2">
                            <label className="text-[10px] font-black text-slate-400 block pr-1">رابط الفيديو (YouTube, Drive, etc.)</label>
                            <div className="relative">
                                <Video className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text"
                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pr-10 py-3 text-sm font-bold text-blue-600 text-left outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={block.videoUrl}
                                    onChange={(e) => updateBlock(index, 'videoUrl', e.target.value)}
                                    dir="ltr"
                                />
                            </div>
                            {block.videoUrl && (
                                <p className="text-[9px] font-bold text-emerald-600 mt-2">✓ سيتم عرض الفيديو في المقال بشكل تلقائي</p>
                            )}
                        </div>
                    )}

                    {block.type === 'steps' && (
                        <div className="space-y-8">
                             {block.steps.map((step, sIndex) => (
                                <div key={step.id} className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 relative">
                                    <div className="absolute -right-2 -top-2 w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-xs font-black z-10 border-2 border-white shadow-md">
                                        {sIndex + 1}
                                    </div>
                                    <div className="flex flex-col gap-6 text-right">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <button onClick={() => removeStepFromBlock(index, sIndex)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                                <label className="text-[10px] font-black text-slate-400 block pr-1">عنوان المرحلة</label>
                                            </div>
                                            <input 
                                                type="text"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 text-right outline-none focus:ring-2 focus:ring-blue-500/20"
                                                placeholder="مثال: مرحلة القص"
                                                value={step.title}
                                                onChange={(e) => updateStepInBlock(index, sIndex, 'title', e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 block pr-1">الشرح</label>
                                                <textarea 
                                                    className="w-full h-32 bg-white border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-600 text-right resize-none outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    placeholder="اكتب شرح المرحلة هنا..."
                                                    value={step.text}
                                                    onChange={(e) => updateStepInBlock(index, sIndex, 'text', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 block pr-1">الصورة</label>
                                                <div className="relative h-32 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all overflow-hidden group">
                                                    {step.isUploading ? (
                                                        <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
                                                    ) : step.image ? (
                                                        <>
                                                            <img src={step.image} className="w-full h-full object-contain p-2" alt="Step" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <button onClick={() => updateStepInBlock(index, sIndex, 'image', null)} className="bg-white text-red-600 p-2 rounded-lg"><Trash2 size={18} /></button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                                                            <input type="file" className="hidden" onChange={(e) => handleStepImageUpload(index, sIndex, e.target.files[0])} />
                                                            <ImageIcon size={24} className="text-slate-300 mb-1" />
                                                            <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-3 py-1 rounded-full border">رفع صورة</span>
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             ))}
                             <button 
                                onClick={() => addStepToBlock(index)}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50/50 transition-all"
                             >
                                <Plus size={18} /> <span className="text-xs font-black">إضافة خطوة داخل هذا القسم</span>
                             </button>
                        </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Dynamic Add Toolbar */}
              <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-8 z-[110]">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                      <button 
                        onClick={() => addBlock('title')}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 rounded-2xl transition-all border border-slate-100 group"
                      >
                        <Type size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black">عنوان قسم</span>
                      </button>

                      <button 
                        onClick={() => addBlock('steps')}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 rounded-2xl transition-all border border-slate-100 group"
                      >
                        <ListOrdered size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black">خطوات التنفيذ</span>
                      </button>

                      <button 
                        onClick={() => addBlock('video')}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 rounded-2xl transition-all border border-slate-100 group"
                      >
                        <Video size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black">فيديو توضيحي</span>
                      </button>

                      <button 
                        onClick={() => addBlock('extra')}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 rounded-2xl transition-all border border-slate-100 group"
                      >
                        <AlignLeft size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black">قسم إضافي</span>
                      </button>
                  </div>
                  <div className="hidden md:flex flex-col items-end">
                      <span className="text-[10px] font-black text-black">شريط الأدوات الديناميكي</span>
                      <span className="text-[9px] font-bold text-slate-400">أضف عناصر المقال بالترتيب الذي تفضله</span>
                  </div>
              </div>
              
              {blocks.length === 0 && (
                <div className="text-center py-20 border-4 border-dashed border-slate-200 rounded-[3rem]">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MoveHorizontal className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-400">ابدأ ببناء محتوى المقال</h3>
                    <p className="text-slate-300 text-xs mt-2">استخدم شريط الأدوات بالأسفل لإضافة العناوين والخطوات والفيديوهات</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 sticky top-28">
                <div className="flex items-center justify-end gap-3 mb-8 border-b border-slate-100 pb-4">
                   <span className="text-sm font-black text-black uppercase">إعدادات الدرس</span>
                   <Settings className="text-black" size={20} />
                </div>

                <div className="space-y-8">
                   <div className="space-y-4">
                     <label className="text-[11px] font-black text-black block text-right px-2">فئة المتدربين</label>
                     <div className="grid grid-cols-3 gap-2">
                        {mainCategories.map((cat) => (
                          <button 
                            key={cat.id}
                            onClick={() => setMainCategory(cat.id)}                             className={`py-3 rounded-xl text-[10px] font-black border transition-all ${mainCategory === cat.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-600 hover:text-blue-600'}`}
                          >
                            {cat.title}
                          </button>
                        ))}
                     </div>
                   </div>

                   <div className="space-y-4 pt-4 border-t-2 border-slate-50">
                     <label className="text-[11px] font-black text-black block text-right px-2">نوع القطعة <span className="text-red-500">*</span></label>
                     <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 text-right focus:ring-4 focus:ring-blue-50/50 focus:border-blue-500 outline-none"
                        placeholder="تيشيرت، قميص..."
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            const matchingCat = allCategories.find(c => c.name === e.target.value && c.mainCategory === mainCategory && c.program === program);
                            if (matchingCat) setCategoryImage(matchingCat.image);
                        }}
                        list="categories-list"
                      />
                      <datalist id="categories-list">
                        {allCategories.filter(c => c.mainCategory === mainCategory && c.program === program).map((c, i) => (
                            <option key={i} value={c.name} />
                        ))}
                      </datalist>
                   </div>

                   <div className="space-y-4 pt-4 border-t-2 border-slate-50">
                     <label className="text-[11px] font-black text-black block text-right px-2">صورة غلاف الفئة (نوع القطعة)</label>
                     <div className="relative h-32 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition-all group overflow-hidden">
                        {isUploadingCatImage ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Loader2 className="animate-spin text-black" /></div>
                        ) : categoryImage ? (
                          <>
                            <img src={categoryImage} className="w-full h-full object-cover" alt="Category Cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button onClick={() => setCategoryImage(null)} className="bg-white border border-slate-200 text-red-600 p-2 rounded-lg hover:scale-110 transition-transform"><Trash2 size={18} /></button>
                            </div>
                          </>
                        ) : (
                          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                            <input type="file" className="hidden" onChange={(e) => handleCategoryImageUpload(e.target.files[0])} />
                            <ImageIcon size={24} className="text-slate-300 mb-2" />
                             <span className="text-[10px] font-black text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">رفع غلاف</span>
                          </label>
                        )}
                     </div>
                   </div>

                   <div className="space-y-4 pt-4 border-t-2 border-slate-50">
                     <label className="text-[11px] font-black text-black block text-right px-2">برنامج الباترون</label>
                     <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setProgram('1')} className={`py-3.5 rounded-2xl text-[11px] font-black border transition-all ${program === '1' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-600 hover:text-blue-600'}`}>
                             Gerber
                           </button>
                            <button onClick={() => setProgram('2')} className={`py-3.5 rounded-2xl text-[11px] font-black border transition-all ${program === '2' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-600 hover:text-blue-600'}`}>
                             Gemini
                           </button>
                     </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateArticle;

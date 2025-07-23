const headlinesBtn = document.querySelector('[data-category="General"]');
const tipsDisplay = document.getElementById("category-display");
const refreshBtn = document.getElementById("refresh");

const feedList=document.getElementById("feed-list");

const nextPageBtn = document.querySelector(".next-page-btn");
const pageBtnsContainer = document.querySelector(".page-btns");

const searchForm=document.querySelector(".search");
const searchInput = document.querySelector(".search-input");
const searchBtn = document.querySelector(".search-btn");

const categoryBtns = document.querySelectorAll("[data-category]");
let lastCategoryBtn = categoryBtns[0];

let articlesArr=[];     //记录API返回的所有数据
const perPage = 5;      //设定每页显示的消息条数(配合页码渲染)
let totalPages;         //记录不同API URL下的总页数（配合页码渲染）
let pageArr=[];         //记录当前应当显示的页码数字(配合页码渲染)
let currentPage=1;      //记录更新当前所在页码(配合分页功能、页码渲染)
let currentSearchItem;
let currentCategory;

//<---------------------------------------------------------初始化加载网页------------------------------------------------------------>
//<---构建API URL--->
function buildURL({searchItem='',category='general',page=1,max=100}={}){
    const API_KEY = "8871327b1c3a49ccbb2a35329ec326ff"; 
    const url=new URL(`https://newsapi.org/v2/${searchItem? 'everything':'top-headlines'}`);
    
    if(searchItem) {
        url.searchParams.set('q',searchItem);
    }else{
        url.searchParams.set('category',category);}

    url.searchParams.set('page',page);
    url.searchParams.set('pageSize',max);
    url.searchParams.set('apiKey',API_KEY);

    return url.toString();    
}

//<---只负责发起请求和返回数据--->
async function fetchNews(url) {
    const response = await fetch(url);
    const data = await response.json();
    console.log(url);
    return data;
}

//<-----------------根据生成的API URL，初始化渲染网页（从第一页开始，显示消息列表、页码）--------------->
async function renderWeb(url){
    try{
        const data = await fetchNews(url);
        articlesArr = data.articles || [];
        console.log(articlesArr);

        //判断返回的数据是否为空
        if(!articlesArr.length){   
            feedList.innerHTML = `<p style="padding: 2em; text-align:center; font-size=3em;">Here is nothing...</p>`;
            nextPageBtn.style.display = "none";
            return;
            }

        currentPage = 1;
        totalPages=Math.ceil(articlesArr.length/perPage);   //注意！这一步必须写在 renderWeb() 里面，因为 articlesArr 是异步请求之后才拿到的，不能在最外层提前计算。否则 totalPages 会是 NaN 或 0 
        renderNewsByPage(currentPage);           //分页渲染消息列表
        renderPageBtns(currentPage,totalPages);  //渲染页码按钮           

    }catch(err){
        console.error("出错了：",err);
        feedList.innerHTML = `<p style="padding: 2em; text-align:center; font-size=3em; color: red;">Something is wrong. Try it later...</p>`;
        nextPageBtn.style.display = "none";
    }
}

//<-----初始化加载网页------->
function defaultWeb(){
    const defaultURL = buildURL({});
    renderWeb(defaultURL);
}
defaultWeb();

//<---------------------------------------------------------分页显示------------------------------------------------------------------>
//<---计算前端应显示的页码范围--->
function getPageArr(currentPage,totalPages){
    let newStart= currentPage-2;    //尝试居中
    if (newStart<1) newStart =1;    //最小边界
    if(newStart>totalPages-4) newStart=totalPages-4; //最大边界（强制显示满5个页码按钮）
    if(totalPages<5) newStart=1;    //考虑总页数不足5的情况，直接从1开始显示所有页

    const count = Math.min(5,totalPages); //限制数组最大长度为5

    return pageArr=Array.from({length:count},(_,i)=>newStart+i); //从newStart开始,生成长度为count的连续数组
}

//<---根据pageArr，渲染页码按钮--->
function renderPageBtns(currentPage,totalPages){
    pageArr=getPageArr(currentPage,totalPages);

    pageBtnsContainer.innerHTML=pageArr.map(pageNum=>{
        return `<span class="page-btn ${pageNum===currentPage?'active':''}">${pageNum}</span>`
    }).join("");
}

//<---【核心】一次性获取当前所有API数据，并根据当前页码提取一定范围的数据，据此渲染当前页的消息列表--->
function renderNewsByPage(currentPage){
    const startIndex = (currentPage-1)*perPage;
    const currentPageArticles = articlesArr.slice(startIndex,startIndex+perPage);
    
    feedList.innerHTML=currentPageArticles.map(article=>{

        const date=new Date(article.publishedAt).toLocaleString("en-US", {  //自定义时间格式
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
            }
        );

        return `<div class="feed-item">
                    <a href="${article.url}" target="_blank"><img src="${article.urlToImage||'assets/keisinCG.jpg'}" class="item-img"></a>
                    <div class="feed-item-detail">
                        <h3 class="item-title"><a href="${article.url}" target="_blank">${article.title}</a></h3>
                        <p class="item-time"><em>${date}</em></p>
                        <p class="item-brief">${article.description || ''}</p>
                    </div>
                </div>`
    }).join('');
};


//<---点击页码跳转：由于页码按钮为动态生成，所以使用事件委托，对其父元素进行监听--->
pageBtnsContainer.addEventListener('click',function(e){
     if (!e.target.classList.contains("page-btn")) return; //判断是否点击的位置是否为页码按钮
    
    currentPage = Number(e.target.textContent);

    renderNewsByPage(currentPage);          //根据当前页码，重新渲染消息列表。非初始化，所以不调用renderWeb()
    renderPageBtns(currentPage,totalPages); //根据当前页码，重新渲染页码按钮
});

//<---点击下一页跳转--->
nextPageBtn.addEventListener('click',function(){
    if(currentPage>=totalPages)return; //判断当前页是否为最后一页
   
    currentPage+=1;
    
    renderNewsByPage(currentPage);
    renderPageBtns(currentPage,totalPages);
});


//<--------------------------------------------------------------分类切换------------------------------------------------------------->
//<---当前分类高亮，并更新文字提示--->
function updateCategoryUI(e){
    
    tipsDisplay.textContent = currentCategory!=="General"?`Top Headlines in ${currentCategory}`:"General News";

    e.target.classList.add('active');
    if(lastCategoryBtn) {   
        lastCategoryBtn.classList.remove('active');
    }
    lastCategoryBtn=e.target;
}

//<----监听并更新currentCategory，获取不同分类下的文章数据，并渲染消息列表------>
categoryBtns.forEach(categoryBtn=>categoryBtn.addEventListener('click',function(e){
    currentSearchItem = null;   //表示当前已经离开了搜索关键词模式，转为分类浏览模式

    currentCategory = e.target.dataset.category;
    
    const categoryURL = buildURL({category:currentCategory});
    renderWeb(categoryURL); //根据当前类目，构建URL获取对应数据，并初始化渲染消息列表
    updateCategoryUI(e);    //渲染导航栏
}))

//<----------------------------------------------------------------搜索功能----------------------------------------------------------->
function searchMatch(){
    currentSearchItem = searchInput.value.trim();

    if(!currentSearchItem) return; //搜索关键词为空时,避免请求

    //分别在逻辑层、UI层转换为“搜索模式”
    currentCategory=""; //让逻辑层知道“现在没有分类被选中”
    const activeBtn = document.querySelector("[data-category].active");
    if (activeBtn) {
        activeBtn.classList.remove("active");
    }

    const searchURL = buildURL({searchItem:currentSearchItem});
    renderWeb(searchURL);   //根据当前搜索关键词，更新数据并初始化渲染网页

    tipsDisplay.textContent=`Articles about ${currentSearchItem.toString()}`;
    searchInput.value='';
}

searchForm.addEventListener('submit',function(e){   //监听form表单的submit事件，可以同时监听到点击enter键和点击type=submit按钮的动作
    e.preventDefault();
    searchMatch();
});


//<--------------------------------------------刷新功能：显示当前类目/搜索结果下的最新消息----------------------------------------------->
refreshBtn.addEventListener('click',()=>{
    let refreshURL;

    //区分是“搜索模式下刷新”还是“分类模式下刷新”
    if(currentSearchItem){
        refreshURL = buildURL({searchItem:currentSearchItem});
    }else{
        refreshURL = buildURL({category:currentCategory});
    }
   
    renderWeb(refreshURL);  //根据当前目录/搜索关键词，更新数据并初始化渲染
}); 



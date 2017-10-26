(function() {
    'use strict';
    window.scrollTo(0,0);
    //Register Service Worker, to manage cache
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('service-worker.js').then(function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          }, function(err) {
            console.log('ServiceWorker registration failed: ', err);
          });
        });
    }

    var app = {
        isLoading: true,
        visibleProducts: {},
        page : 1,
        recordsPerPage : 50,
        totalRecords : 0,
        recordsReceived : 0,
        lastKey : {},
        search : "",
        sort : "",
        dummyIMageCount : 1,
        spinner: document.querySelector('.loader'),
        productTemplate: document.querySelector('.single-product'),
        container: document.querySelector('.productWrapper')
    };
    
    document.getElementById('butRefresh').addEventListener('click', function() {
        // Refresh all of the products
        app.refreshLoadedProduct();
    });
    
    // Detect when scrolled to bottom.
    
    document.addEventListener('scroll', function() {
        if (app.page == 1 && app.recordsReceived == 0) {
            window.scrollTo(0,0);
        }
        if ((document.documentElement.scrollTop + document.documentElement.clientHeight) >= app.container.clientHeight && app.totalRecords > 0 && app.recordsReceived > 0) {
            console.log('--------------------------------- LOAD NEXT PAGE ---------------------------------------------');            
            if (!app.isLoading) {
                app.isLoading = true;
                app.loadNextPage();
            }
        }
    });
    
    app.showLoader = function(isReset){
        if(isReset){
            app.container.setAttribute('hidden', true);
        }
        
        app.spinner.removeAttribute('hidden');
        app.isLoading = true;
        
    }
    
    app.hideLoader = function(){
        if (app.isLoading) {
            setTimeout(function(){
                app.spinner.setAttribute('hidden', true);
                app.container.removeAttribute('hidden');
                app.isLoading = false;    
            },100);            
        }
    }
    
    app.updateProductInfo = function(productList) {
        
        productList.forEach(function(data) {
            
            var product = app.visibleProducts[data.id];
            if (!product) {
              product = app.productTemplate.cloneNode(true);
              product.classList.remove('productTemplate');
              product.classList.add('activeProduct');
              app.container.appendChild(product);
              app.visibleProducts[data.id] = product;
            }
        
            // Verifies the data provide is newer than what's already visible        
            var dataLastUpdated = new Date(data.updatedAt);
            var productLastUpdated = product.querySelector('.product-last-updated');
            var productLastUpdatedOn = productLastUpdated.textContent;
            if (productLastUpdatedOn) {
                productLastUpdatedOn = new Date(productLastUpdatedOn);
                if (dataLastUpdated.getTime() < productLastUpdatedOn.getTime()) {
                    return;
                }
            }
            
            productLastUpdated.textContent = data.updatedAt;
            
            product.querySelector('.productName').textContent = data.productName.substring(0, 20);
            //product.querySelector('.productImage').src = 'images/product-5.jpg'; //data.image;
            //product.querySelector('.productImage').src = 'https://source.unsplash.com/200x200?ts='+new Date().getTime() + i;
            product.querySelector('.productImage').src = 'https://picsum.photos/200/200/?image='+ (app.dummyIMageCount == 86 || app.dummyIMageCount == 97 ? 1 : app.dummyIMageCount);
            
            product.querySelector('.product-carousel-price').textContent = '$' + data.price;
            product.querySelector('.description').textContent = data.description.substring(0, 50) + ' ...Read More';
            product.removeAttribute('hidden');
            app.dummyIMageCount = app.dummyIMageCount > 1000 ? 1 : (app.dummyIMageCount + 1);
            
        });
            
        app.hideLoader();
       
        
    };
    
    app.getProducts = function() {
        var url = 'https://10.1.0.139:3000/api/common/product_list?page=' + app.page;
        if ('caches' in window) {
            /*
             * Check if the service worker has already cached this data
             * If the service worker has the data, then display the cached
             * data while the app fetches the latest data.
             */
            caches.match(url).then(function(response) {
                console.log('Cached Result', response);
                if (response) {
                    response.json().then(function updateFromCache(cachedData) {
                        console.log('Cached Result', cachedData);
                        if (cachedData && cachedData.result && cachedData.result.products) {
                            app.totalRecords = cachedData.result.totalProducts,
                            app.recordsReceived = (app.recordsReceived + cachedData.result.products.length),
                            app.lastKey = cachedData.result.lastKey;
                            app.updateProductInfo(cachedData.result.products);                            
                        }                                            
                    });
                }
            });
        }
        app.showLoader();
        // Fetch the latest data.
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    console.log('Fetched Result', response);                
                    if (response && response.status == 'success' && response.result && response.result.products) {
                        app.totalRecords = response.result.totalProducts,
                        app.recordsReceived = (app.recordsReceived + response.result.products.length),
                        app.lastKey = response.result.lastKey;
                        app.updateProductInfo(response.result.products);    
                    }else{
                        app.hideLoader();    
                    }
                    
                }else{
                    app.hideLoader();
                }
                
            } else {
                app.hideLoader();
            }
        };
        
        request.open('POST', url, true);
        request.setRequestHeader('x-api-key', '640B9945A52A15BED87E3CF99423570CC9B8FD76CCE11CAF09DC1D5CB87C4823');
        request.setRequestHeader('Content-Type', 'application/json;charset=utf-8');
        if (app.lastKey && app.lastKey.hash) {
            request.send(JSON.stringify({ lastKey: app.lastKey }));    
        }else{
            request.send();
        }
        
    };
    
    var listElm = document.querySelector('#infinite-list');


    app.loadNextPage = function(){
        if (app.totalRecords > app.recordsReceived || app.recordsReceived == 0) {
            app.page = (app.page + 1);
            app.getProducts();
        }else{
            app.hideLoader();
        }
        
    }
    
    
    app.refreshLoadedProduct = function() {
        app.showLoader(true);
        app.lastKey = {},
        app.recordsReceived = 0,
        app.totalRecords = 0,
        app.visibleProducts = {},
        app.page = 1;
        
        
        var elements = document.getElementsByClassName('activeProduct');
        while(elements.length > 0){
            elements[0].parentNode.removeChild(elements[0]);
        }
        app.getProducts();
    };
    
    
    app.getProducts();
    
})();

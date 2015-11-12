(function( $ ) {
	

	var mouseDown = false;
  
    document.body.onmousedown = function() { 
        mouseDown = true;
    }
    document.body.onmouseup = function() {
        mouseDown = false;
    }
 
    jQuery.fn.springyCarousel = function(options) {
      
      
      
      
      var inputEvents = {},
	 	funcs = {},
		utils = {},
		springs = {},
		springSystem = new rebound.SpringSystem();

	
      //general globals
      var springyCarouselGlobals = {
          navigation:{
              nav:null,
              navItems:[],
              navOffsets:[],
              navItemWidths:[],
              navItemWidthsRunningSum:[],
              downIndex:0
          },
          carousel:{
              currentPage:0
          },
          dragging:{
              isDragging:false
          },
          viewport:{
              viewportWidth:0,
              viewportHeight:0
          },
          springs:{
              mainSpring:springSystem.createSpring(),
              navigationSpring:springSystem.createSpring()
          }
      }
      
      
       utils.clampedProgress = function(progress) {
		if (progress < 0)
			progress = 0;
		else if (progress > 1)
			progress = 1;
			
		return progress;
	}
    
    
    

    
    
	
	funcs.recalculateSize = function(){
		springyCarouselGlobals.viewport.viewportWidth = $("#wrapper").innerWidth();
		springyCarouselGlobals.viewport.viewportHeight = $("#slides li").innerHeight();
	}
	
	
	funcs.calculateNavWidth = function(navigation_items){
		var totalWidth = 0;
		
		navigation_items.each(function(i, val) {
		    springyCarouselGlobals.navigation.navItemWidths[i] = $(val).innerWidth();
		    springyCarouselGlobals.navigation.navItemWidthsRunningSum[i] = springyCarouselGlobals.navigation.navItemWidths[i];
		    
		    if (i > 0) {
			    springyCarouselGlobals.navigation.navItemWidthsRunningSum[i] = springyCarouselGlobals.navigation.navItemWidthsRunningSum[i] + springyCarouselGlobals.navigation.navItemWidthsRunningSum[i-1];
		    }
		    
		    totalWidth += springyCarouselGlobals.navigation.navItemWidths[i];
		});
		
		return totalWidth;
	}
	
	
	funcs.navOffsetForIndex = function(i) {
		if (i > 0) {
			var offset = (springyCarouselGlobals.navigation.navItemWidthsRunningSum[i-1] + (springyCarouselGlobals.navigation.navItemWidths[i] / 2.0)) * -1;
		} else {
			var offset = ((springyCarouselGlobals.navigation.navItemWidths[i] / 2.0)) * -1;
		}
		return offset;
	}
		
	
	funcs.selectTabIndex = function(i, animated) {
		if (i < 0){
			i = 0;
		}
		else if (i > springyCarouselGlobals.navigation.navItems.length - 1){
			i = springyCarouselGlobals.navigation.navItems.length - 1;
		}
	
		if (animated) {
			springyCarouselGlobals.viewport.viewportWidth = $("#wrapper").innerWidth();
			springyCarouselGlobals.carousel.currentPage = i;
			springyCarouselGlobals.springs.mainSpring.setEndValue(i);
		} else {
			springyCarouselGlobals.springs.mainSpring.setCurrentValue(i);
		}
	}
	
	
	
	
	
	
	
	
	
	inputEvents.addArrowKeySupport = function(){
		var initialPress = true;
		var isRubberbanding = false;
	
		$(document).keydown(function(e){
			var currentIndex = springyCarouselGlobals.carousel.currentPage;
			var positionTolerance = 0.001;
			var maxRubberbandDistance = 0.03; // Normalized
	
		    if (e.keyCode == 37) { // Left arrow key
		    	var inRubberbandableRegion = springyCarouselGlobals.springs.mainSpring.getCurrentValue() < positionTolerance;
		    	
		    	if (inRubberbandableRegion && initialPress) {
		    		isRubberbanding = true;
		    		springyCarouselGlobals.springs.mainSpring.setEndValue(springyCarouselGlobals.springs.mainSpring.getCurrentValue() - maxRubberbandDistance);
		    	} 
		    	else if (!inRubberbandableRegion) {
		    		isRubberbanding = false;
		    		funcs.selectTabIndex(currentIndex - 1, true);
		    	}
		    }
		    
		    else if (e.keyCode == 39) { // Right arrow key
		    	var inRubberbandableRegion = springyCarouselGlobals.springs.mainSpring.getCurrentValue() > ((springyCarouselGlobals.navigation.navItems.length - 1) - positionTolerance);
		    
				if (inRubberbandableRegion && initialPress) {
					isRubberbanding = true;
					springyCarouselGlobals.springs.mainSpring.setEndValue(springyCarouselGlobals.springs.mainSpring.getCurrentValue() + maxRubberbandDistance);
				} 
				else if (!inRubberbandableRegion) {
					isRubberbanding = false;
					funcs.selectTabIndex(currentIndex + 1, true);
				}
		    }
		    
		    initialPress = false;
		});
	
		// When rubberbanding, snap back to the correct rest value on key up
		$(document).keyup(function(e){
			var currentIndex = springyCarouselGlobals.carousel.currentPage;
			
			if (e.keyCode == 37 && isRubberbanding) { // Left arrow key
				funcs.selectTabIndex(currentIndex - 1, true);
			}
			else if (e.keyCode == 39 && isRubberbanding) { // Right arrow key
				funcs.selectTabIndex(currentIndex + 1, true);
			}
			
			isRubberBanding = false;
			initialPress = true;
		});
	
	}
	
	
	
	
	
	
	
	
	inputEvents.addDragSupport = function(item){
		item.addEventListener('touchstart', function(e) {
			var touch = e.touches[0];
			startDragging(touch.pageX);
		}, false);
		
		item.addEventListener('touchmove', function(e) {
		    e.preventDefault(); // Stop vertical rubberbanding on iOS
		
			var touch = e.touches[0];	
			continueDragging(touch.pageX);
		}, false);
		
		item.addEventListener('touchend', function(e) {
			endDragging();
		}, false);
		
		item.addEventListener('touchcancel', function(e) {
			endDragging();
		}, false);
		
		item.addEventListener('mousedown', function(e) {
			startDragging(e.clientX);
		}, false);
		
		item.addEventListener('mousemove', function(e) {
//            console.log('mouse moving'+springyCarouselGlobals.dragging.isDragging)
            
//            if (mouseDown) {
//                console.log('continue drag'+mouseDown);
//              continueDragging(e.clientX);
//            }
          
			if (springyCarouselGlobals.dragging.isDragging)
				continueDragging(e.clientX);
		}, false);
		
		item.addEventListener('mouseup', function(e) {
			endDragging();
		}, false);
		
		item.addEventListener('mouseleave', function(e) {
			if (springyCarouselGlobals.dragging.isDragging)
				endDragging();
		}, false);
	}
	
	
	
	
	
	
	
	var startDragging = function(x) {
//        console.log ('start')
		lastX = x;
		springyCarouselGlobals.dragging.isDragging = true;
		springyCarouselGlobals.viewport.viewportWidth = $(settings.carouselWrapperSelector).innerWidth();
		springyCarouselGlobals.springs.mainSpring.setAtRest();
	}
	
	var continueDragging = function(x) {
//        console.log ('continue')
		panVelocity = x - lastX;
		lastX = x;
		
	    var progress = springs.progressForValueInRange(panVelocity,0,-springyCarouselGlobals.viewport.viewportWidth);
	    
	    var currentValue = springyCarouselGlobals.springs.mainSpring.getCurrentValue();
	    
	    // Rubberband when beyond the scroll boundaries
	    if ((currentValue + progress) < 0 || (currentValue + progress) > springyCarouselGlobals.navigation.navItems.length - 1)
	    	progress *= 0.5;
	    
	    springyCarouselGlobals.springs.mainSpring.setCurrentValue(currentValue + progress);
		springyCarouselGlobals.springs.mainSpring.setAtRest();
	}
	
	var endDragging = function() {
		var currentPosition = springyCarouselGlobals.springs.mainSpring.getCurrentValue();
		var restPosition = springyCarouselGlobals.carousel.currentPage;
		
		var passedVelocityTolerance = (Math.abs(panVelocity) > 3);
		var passedDistanceTolerance = Math.abs(currentPosition - restPosition) > 0.3;
		var shouldAdvance = passedDistanceTolerance || passedVelocityTolerance;
		var advanceForward = (panVelocity <= 0);
		if (shouldAdvance) {
			var targetIndex = advanceForward ? restPosition + 1 : restPosition - 1;
			funcs.selectTabIndex(targetIndex, true);
		} else {
			funcs.selectTabIndex(restPosition, true);	    	
		}
		
		var normalizedVelocity = springs.progressForValueInRange(panVelocity,0,-springyCarouselGlobals.viewport.viewportWidth);
		springyCarouselGlobals.springs.mainSpring.setVelocity(normalizedVelocity * 30);
		panVelocity = 0;
		springyCarouselGlobals.dragging.isDragging = false;
	}

	
	
	
	
	
	
	
	
	
	
	
	springs.setupMainSpring = function(friction,tension,callback){
		springyCarouselGlobals.springs.mainSpring.setSpringConfig(rebound.SpringConfig.fromQcTensionAndFriction(tension, friction));
		
		springyCarouselGlobals.springs.mainSpring.addListener({	
		    onSpringUpdate: function (spring) {
		    	// Progress from 0 to n
		    	var progress = spring.getCurrentValue();
	
		    	// Slide the springyCarouselGlobals.navigation.navItems over
		   		var xTranslation = springs.transitionForProgressInSteps(progress,springyCarouselGlobals.navigation.navOffsets);
		   		
		   		// Pixel snap when the spring is nearing rest on non-retina displays
		   		if (Math.abs(spring.getVelocity()) < 0.05 && window.devicePixelRatio < 1.1){
		   			xTranslation = Math.floor(xTranslation);
		   		}
		   		
		   		callback(xTranslation,progress,spring);
			}      
		});
	}
	
	
	
	
	
	springs.setupNavigationSpring = function(friction,tension) {
		springyCarouselGlobals.springs.navigationSpring.setSpringConfig(rebound.SpringConfig.fromQcTensionAndFriction(tension, friction));
		
		springyCarouselGlobals.springs.navigationSpring.addListener({
			onSpringUpdate: function (spring) {
				var progress = spring.getCurrentValue();
				var scale = springs.transitionForProgressInRange(progress,1.0,0.92);
				springyCarouselGlobals.navigation.navItems[springyCarouselGlobals.navigation.downIndex].style['webkitTransform'] = 'scale('+scale+')';
				springyCarouselGlobals.navigation.navItems[springyCarouselGlobals.navigation.downIndex].style['MozTransform'] = 'scale('+scale+')';
			}
		});
	}
	
	
	
	
	
	
	springs.transitionForProgressInSteps = function(progress, steps) {
		var transition = -1;
		
		// Bail if there's fewer than two steps
		if (steps.length < 2) { return transition };
		
		// If the progress is before the beginning of the range, extrapolate from the first and second steps.
		if (progress < 0) {
			transition = springs.transitionForProgressInRange(progress, steps[0], steps[1]);
		}
	
		// If the progress is after the end of the range, extrapolate from the second last and last steps.
		else if (progress > (steps.length - 1)) {
			normalizedProgress = springs.progressForValueInRange(progress, Math.floor(progress), Math.floor(progress)+1);
			normalizedProgress = normalizedProgress + 1;
			transition = springs.transitionForProgressInRange(normalizedProgress, steps[(steps.length - 2)], steps[(steps.length - 1)]);
		}
		
		// Supress potential NaNs
		else if (progress == (steps.length - 1) || progress == 0) {
			transition = steps[progress];
		}
		
		// Otherwise interpolate between steps
		else {
			normalizedProgress = springs.progressForValueInRange(progress, Math.floor(progress), Math.floor(progress)+1);
			transition = springs.transitionForProgressInRange(normalizedProgress, steps[Math.floor(progress)], steps[Math.floor(progress)+1]);
		}
		
		return transition;
	}
	
	
	springs.transitionForProgressInRange = function(progress, startValue, endValue) {
		return startValue + (progress * (endValue - startValue));
	}
	
	
	springs.progressForValueInRange = function(value, startValue, endValue) {
		return (value - startValue) / (endValue - startValue);
	}	

    
    
 		var defaults = {
	        carouselWrapperSelector : '#wrapper',
	        slidesSelector : '#slides li',
	        navigationSlider:'#nav',
	        navigation:{
	        	keys:false,
	        	drag:true
	        },
	        frictionAndTension:{
	        	navigation:{
	        		friction:5.5,
	        		tension:100
	        	},
	        	carousel:{
	        		friction:5.7,
	        		tension:4.5
	        	}
	        },
	        carouselTransitionComplete:null
	    };
 		
 		var settings = $.extend( {}, defaults, options );

		var navigation_items = null;
      
		

		
		
		
		springyCarouselGlobals.viewport.viewportWidth = $(settings.carouselWrapperSelector).innerWidth();
		springyCarouselGlobals.viewport.viewportHeight = $(settings.slidesSelector).innerHeight();
		springyCarouselGlobals.navigation.nav = document.getElementById(settings.navigationSlider.replace('#',''));
		
		
		//set width for slider nav
		navigation_items = $(settings.navigationSlider).children('li');
		
		var navigationSliderTotalWidth = funcs.calculateNavWidth(navigation_items);
		$(settings.navigationSlider).width(navigationSliderTotalWidth);
		navigation_items.each(function(i, val) {
			springyCarouselGlobals.navigation.navOffsets[i] = funcs.navOffsetForIndex(i);
			springyCarouselGlobals.navigation.navItems[i] = val;
		});
		
		
		springs.setupMainSpring(settings.frictionAndTension.carousel.friction,settings.frictionAndTension.carousel.tension, function(xTranslation,progress,spring){
//			springyCarouselGlobals.navigation.nav.style['webkitTransform'] = 'translate3d(' + xTranslation + 'px, 0, 0)';
//			springyCarouselGlobals.navigation.nav.style['MozTransform'] = 'translate3d(' + xTranslation + 'px, 0, 0)';
			
			// Other transitions
			$(settings.slidesSelector).each(function(i, val) {
				var slideProgress = 1 - Math.abs(progress - i);
				currentSlide = springyCarouselGlobals.carousel.currentPage
				// Slide and scale the images
				if (slideProgress > 0) { // Only bother if the slide is visible
					// Slide and scale
                    //768 px, show images either size
                    divider = 1;
                    if ($(window).width() <= 768){
                      divider = 1.5; // ratio to divide translate of slide
                    }
                    
					var x = (i * springyCarouselGlobals.viewport.viewportWidth) - (progress * springyCarouselGlobals.viewport.viewportWidth);
					var scale = springs.transitionForProgressInRange(slideProgress,0.6,1.0);
					val.style['webkitTransform'] = 'translate3d(' + x/divider + 'px, 0, 0) scale(' + scale +')';
					val.style['MozTransform'] = 'translate3d(' + x/divider + 'px, 0, 0) scale(' + scale +')';
                  
                    
                  

                      
				} 
              
              
//                if (currentSlide == i){
//                  val.style['opacity'] = 1.0;
//                }
//                else if((i==currentSlide+1||i==currentSlide-1) && slideProgress > 0 ){
//                  val.style['opacity'] = 1.0;
//                }
//                else{
//                  val.style['opacity'] = 0.0;
//                }
              
                  if (slideProgress <= 1.5 && slideProgress >= -0.5){
                      
                      val.style['display'] = 'block';
                      if(i==currentSlide){
                        val.style['opacity'] = 1.0;  
                      }else{
                        val.style['opacity'] = 0.5;
                      }
                  }
                  else{
                      val.style['opacity'] = 0.0;
                      val.style['display'] = 'none';
                  }
              
              
                    
              
//                else if (currentSlide == 0 && (i!=1 || i==0)){
//                  val.style['opacity'] = 0.0;
//                }
//
//                else if (currentSlide!=0 && (i!=currentSlide+1 || i!=currentSlide-1)){
//                  val.style['opacity'] = 0.0;
//                }
//                else{
//                  val.style['opacity'] = 1.0;
//                }
//								
				// Hide the off-screen images so they don't reveal themselves if you resize the browser
//                val.style['opacity'] = (slideProgress > 0) ? 1.0 : 0.0;

				// Show the current tab as black, others grey
				var tabOpacity = springs.transitionForProgressInRange(utils.clampedProgress(slideProgress),0.2,1,0);
				springyCarouselGlobals.navigation.navItems[i].style['opacity'] = tabOpacity;	
				
				if(progress.toString().split('.').length === 1 && settings.carouselTransitionComplete){
					settings.carouselTransitionComplete(spring,xTranslation)
				}
			});
		})
		
		
		
		springs.setupNavigationSpring(settings.frictionAndTension.navigation.friction,settings.frictionAndTension.navigation.tension);
		
		
		
		$(settings.slidesSelector).each(function(i, val) {
			val.style['webkitTransform'] = 'translate3d(' + (springyCarouselGlobals.viewport.viewportWidth * i) - 350 + 'px, 0, 0)';	
			val.style['MozTransform'] = 'translate3d(' + (springyCarouselGlobals.viewport.viewportWidth * i) - 350 + 'px, 0, 0)';
			slides[i] = val;
		});
		
		// Select the first tab
		funcs.selectTabIndex(0, false);
		
		
		
		
		// Setup the supported navigation methods
		if(settings.navigation.keys){
			inputEvents.addArrowKeySupport()
		}
		
		if(settings.navigation.drag){
			inputEvents.addDragSupport($(settings.slidesSelector).parent()[0])
		}
		
		
		
		// Behavior when the springyCarouselGlobals.navigation.navItems are clicked
		$(settings.navigationSlider).children('li').each(function(i, val) {
			$(val).click(function() {
				funcs.selectTabIndex(i, true);
			});
			
			$(val).mousedown(function() {
				springyCarouselGlobals.navigation.downIndex = $(this).index();
				springyCarouselGlobals.springs.navigationSpring.setEndValue(1);
			});
			
			$(val).mouseup(function() {
				springyCarouselGlobals.springs.navigationSpring.setEndValue(0);
			});
		});
      
        // Behavior when clicking on a carouself item. BUGGY!
//        $(settings.slidesSelector).each(function(i, val){
//            $(val).click(function(event) {
//                event.stopPropagation();
//				funcs.selectTabIndex(i, true);
//			});
//        });
      
        
        // BUG WORK AROUND!!!!!!!!
        ////////// //go to last slide (bug work around)  ///////
        $(settings.navigationSlider+' li').last().click()

        setTimeout(function(){
        //    mid = ($('#slides li').length-1)/2;

          //  //go to middle slide
          $(settings.navigationSlider+' li').slice(($(settings.slidesSelector).length-1)/2 , ($(settings.slidesSelector).length-1)/2+1).click();
          //    springy_carousel.goToPage(($('#slides li').length-1)/2)
        },2000)
        // BUG WORK AROUND END!!!!!!!!
        
        

			
			
		//declare public methods
		this.recalculateSize = funcs.recalculateSize;
		this.goToPage = funcs.selectTabIndex;		
		return this;
    };
    
    
    
    
    
   
	 
}( jQuery ));

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(event) {
        if (event.target.closest('.btn-like')) {
            const button = event.target.closest('.btn-like');
            const postId = button.dataset.postId;
            likePost(postId, button);
        }
    });
});

function likePost(postId, button) {
    fetch(`/like/${postId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const likeCount = button.querySelector('.like-count');
            likeCount.textContent = parseInt(likeCount.textContent) + 1;
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
} 
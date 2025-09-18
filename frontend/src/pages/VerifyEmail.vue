<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const loading = ref(true);
const error = ref('');
const success = ref('');

onMounted(async () => {
  const token = route.query.token;

  if (!token) {
    error.value = 'Không tìm thấy token xác thực';
    loading.value = false;
    return;
  }

  try {
    const res = await axios.post('http://localhost:8000/auth/verify-email', { token });
    loading.value = false;

    if (res.data.status === "Success" && res.data.data === true) {
      success.value = 'Xác thực email thành công!';

      
      const email = route.query.email || '';
      localStorage.setItem('registerEmail', email);
      localStorage.setItem('emailVerified', 'true');

      
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      error.value = res.data.message || 'Xác thực thất bại';
    }
  } catch (err) {
    console.error(err);
    loading.value = false;
    error.value = 'Lỗi xác thực email. Vui lòng thử lại.';
  }
});
</script>


<style scoped>
.verify-email-container {
  text-align: center;
  margin-top: 50px;
  font-family: 'Circular Spotify Text', Arial, sans-serif;
}
</style>

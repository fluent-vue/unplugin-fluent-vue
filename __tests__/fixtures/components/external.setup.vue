<script setup>
const userName = 'test'
</script>

<template>
  <div>
    <div>{{ $t('hello-user', { userName }) }}</div>
    <div>{{ $t('shared-photos', { userName, photoCount, userGender }) }}</div>
  </div>
</template>

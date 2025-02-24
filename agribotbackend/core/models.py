from django.db import models
import math

class Field(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=200, blank=True, null=True)
    geometry = models.JSONField() # GeoJSON
    size = models.FloatField(help_text="Size of the field in acres")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name}"
    
    def get_representative_coordinate(self):
        if not self.geometry:
            return None
        try:
            if isinstance(self.geometry, dict):
                lat, lng = self.geometry['coordinates'][0][0]
            else:
                lat, lng = self.geometry[0][0]
        except (KeyError, IndexError):
            return None
        return lat, lng
    
    def getXY(self, lat, lon, zoom):
        numTiles = 1 << zoom
        lat = max(-85.05112878, min(85.05112878, lat))
        lon = (lon + 180) % 360 - 180
        x = round((lon + 180) / 360 * numTiles)
        y = round((1 - math.log(math.tan(lat * math.pi / 180) + 1 / math.cos(lat * math.pi / 180)) / math.pi) / 2 * numTiles)
        return [x, y]

    def getGoogleMapsTileUrl(self, longitude, latitude, zoom):
        xTile, yTile = self.getXY(latitude, longitude, zoom)

        url = f'https://mt1.google.com/vt/lyrs=y&x={xTile}&y={yTile}&z={zoom}'
        return url
    
    @property
    def main_coordinate(self):
        return self.get_representative_coordinate()
    
    @property
    def google_maps_url(self):
        if not self.main_coordinate:
            return None
        return self.getGoogleMapsTileUrl(self.main_coordinate[0], self.main_coordinate[1], 17)
    
class FieldData(models.Model):
    field = models.ForeignKey(Field, on_delete=models.CASCADE)
    temperature = models.FloatField(null=True, blank=True)
    humidity = models.FloatField(null=True, blank=True)
    soil_moisture = models.FloatField(null=True, blank=True)
    img = models.ImageField(upload_to='field_data', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    location = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.field.name} - {self.created_at}"